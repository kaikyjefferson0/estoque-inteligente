import re

from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.supplier import Supplier
from app.services.paginacao import padrao_de_busca, paginar
from app.services.teto_demo import TetoDoDemoError, conferir_teto  # noqa: F401  (a rota trata o erro)

PONTUACAO_CNPJ = re.compile(r"[.\-/\s]")
CNPJ_14_DIGITOS = re.compile(r"[0-9]{14}")


class CnpjInvalidoError(Exception):
    pass


class CnpjJaCadastradoError(Exception):
    pass


class FornecedorNaoEncontradoError(Exception):
    pass


class FornecedorComProdutosError(Exception):
    """RN-59: fornecedor com produtos vinculados não pode ser excluído."""

    def __init__(self, quantidade: int):
        self.quantidade = quantidade
        super().__init__(f"Este fornecedor tem {quantidade} produto(s) vinculado(s) e não pode ser excluído.")


# FK RESTRICT de products.fornecedor_id (RN-59): o banco recusa apagar fornecedor com produto
FK_PRODUTO_FORNECEDOR = "fk_products_fornecedor_id_suppliers"


def nome_da_restricao(erro: IntegrityError) -> str | None:
    return getattr(getattr(erro.orig, "diag", None), "constraint_name", None)


def normalizar_cnpj(cnpj: str | None) -> str | None:
    """RN-25: aceita com ou sem pontuação e devolve só os 14 números.

    RN-06: CNPJ vazio (ou só espaços) conta como não informado. Só pontuação,
    como "../-", foi informado e não tem os 14 números, então é recusado.
    """
    if cnpj is None or not cnpj.strip():
        return None
    digitos = PONTUACAO_CNPJ.sub("", cnpj)
    if not CNPJ_14_DIGITOS.fullmatch(digitos):
        raise CnpjInvalidoError("O CNPJ tem 14 números. Complete o número ou deixe em branco.")
    return digitos


def _cnpj_em_uso(db: Session, cnpj: str | None, ignorar_id: int | None = None) -> bool:
    if cnpj is None:
        return False
    consulta = select(Supplier.id).where(Supplier.cnpj == cnpj)
    if ignorar_id is not None:
        consulta = consulta.where(Supplier.id != ignorar_id)
    return db.scalar(consulta) is not None


def _salvar(db: Session, fornecedor: Supplier, cnpj: str | None) -> Supplier:
    try:
        db.commit()
    except IntegrityError as erro:
        db.rollback()
        # Outro cadastro com o mesmo CNPJ entrou entre a busca e o commit
        if nome_da_restricao(erro) == "uq_suppliers_cnpj":
            raise CnpjJaCadastradoError(cnpj)
        raise
    db.refresh(fornecedor)
    return fornecedor


def criar_fornecedor(db: Session, nome: str, cnpj: str | None = None) -> Supplier:
    conferir_teto(db, Supplier, "fornecedores")  # RN-57
    cnpj = normalizar_cnpj(cnpj)
    if _cnpj_em_uso(db, cnpj):
        raise CnpjJaCadastradoError(cnpj)

    fornecedor = Supplier(nome=nome.strip(), cnpj=cnpj)
    db.add(fornecedor)
    return _salvar(db, fornecedor, cnpj)


def listar_fornecedores(db: Session, limite: int, deslocamento: int, busca: str | None = None) -> dict:
    """Uma página de fornecedores (RN-51); `busca` filtra por parte do nome ou do CNPJ
    (o CNPJ é comparado só pelos números, com ou sem pontuação na busca)."""
    consulta = select(Supplier).order_by(Supplier.id)
    termo = (busca or "").strip()
    if termo:
        condicoes = [Supplier.nome.ilike(padrao_de_busca(termo), escape="\\")]
        digitos = PONTUACAO_CNPJ.sub("", termo)
        if digitos.isascii() and digitos.isdigit():
            condicoes.append(Supplier.cnpj.contains(digitos))
        consulta = consulta.where(or_(*condicoes))
    pagina = paginar(db, consulta, limite, deslocamento)
    return pagina.com_itens([linha[0] for linha in pagina.linhas])


def obter_fornecedor(db: Session, fornecedor_id: int, travar: bool = False) -> Supplier:
    # FOR NO KEY UPDATE (a trava de um UPDATE comum): espera uma exclusão em andamento, mas não
    # conflita com o FOR KEY SHARE que a FK pega quando um produto é gravado com este fornecedor
    trava = {"key_share": True} if travar else None
    fornecedor = db.get(Supplier, fornecedor_id, with_for_update=trava, populate_existing=travar)
    if fornecedor is None:
        raise FornecedorNaoEncontradoError(fornecedor_id)
    return fornecedor


def atualizar_fornecedor(db: Session, fornecedor_id: int, dados: dict) -> Supplier:
    """Altera nome e/ou CNPJ. `dados` só traz os campos enviados.

    Trava a linha: se o fornecedor for excluído ao mesmo tempo (RN-59), a edição espera e
    responde 404, em vez de tentar um UPDATE numa linha que sumiu.
    """
    fornecedor = obter_fornecedor(db, fornecedor_id, travar=True)

    if "cnpj" in dados:
        cnpj = normalizar_cnpj(dados["cnpj"])
        if _cnpj_em_uso(db, cnpj, ignorar_id=fornecedor.id):
            raise CnpjJaCadastradoError(cnpj)
        fornecedor.cnpj = cnpj
    if "nome" in dados:
        fornecedor.nome = dados["nome"].strip()

    return _salvar(db, fornecedor, fornecedor.cnpj)


def substituir_fornecedor(db: Session, fornecedor_id: int, nome: str, cnpj: str | None) -> Supplier:
    """RN-19: PUT, o fornecedor inteiro; `cnpj` None deixa sem CNPJ (RN-06). Mesmas validações do PATCH."""
    return atualizar_fornecedor(db, fornecedor_id, {"nome": nome, "cnpj": cnpj})


def _contar_produtos(db: Session, fornecedor_id: int) -> int:
    return db.scalar(select(func.count()).select_from(Product).where(Product.fornecedor_id == fornecedor_id))


def excluir_fornecedor(db: Session, fornecedor_id: int) -> None:
    """RN-59: só exclui fornecedor sem produtos vinculados. A permissão (só admin) fica na rota.

    RN-25: o CNPJ fica livre para outro fornecedor depois da exclusão.

    Sem trava antes da contagem, de propósito: um produto ligado no meio do caminho é recusado
    pela FK do banco, e essa recusa vira o mesmo 409.
    """
    obter_fornecedor(db, fornecedor_id)
    quantidade = _contar_produtos(db, fornecedor_id)
    if quantidade:
        raise FornecedorComProdutosError(quantidade)

    try:
        apagadas = db.execute(delete(Supplier).where(Supplier.id == fornecedor_id)).rowcount
        if apagadas == 0:
            # Outra exclusão do mesmo fornecedor terminou primeiro
            db.rollback()
            raise FornecedorNaoEncontradoError(fornecedor_id)
        db.commit()
    except IntegrityError as erro:
        db.rollback()
        # Um produto foi ligado ao fornecedor entre a contagem e o DELETE: a FK recusa.
        # Raro: se esse produto já trocou de fornecedor, a nova contagem dá 0 e a mensagem diz 1.
        if nome_da_restricao(erro) == FK_PRODUTO_FORNECEDOR:
            raise FornecedorComProdutosError(max(_contar_produtos(db, fornecedor_id), 1))
        raise
