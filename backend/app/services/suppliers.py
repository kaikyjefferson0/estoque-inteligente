import re

from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.supplier import Supplier
from app.services.paginacao import padrao_de_busca, paginar

PONTUACAO_CNPJ = re.compile(r"[.\-/\s]")
CNPJ_14_DIGITOS = re.compile(r"[0-9]{14}")


class CnpjInvalidoError(Exception):
    pass


class CnpjJaCadastradoError(Exception):
    pass


class FornecedorNaoEncontradoError(Exception):
    pass


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
        if getattr(getattr(erro.orig, "diag", None), "constraint_name", None) == "uq_suppliers_cnpj":
            raise CnpjJaCadastradoError(cnpj)
        raise
    db.refresh(fornecedor)
    return fornecedor


def criar_fornecedor(db: Session, nome: str, cnpj: str | None = None) -> Supplier:
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


def obter_fornecedor(db: Session, fornecedor_id: int) -> Supplier:
    fornecedor = db.get(Supplier, fornecedor_id)
    if fornecedor is None:
        raise FornecedorNaoEncontradoError(fornecedor_id)
    return fornecedor


def atualizar_fornecedor(db: Session, fornecedor_id: int, dados: dict) -> Supplier:
    """Altera nome e/ou CNPJ. `dados` só traz os campos enviados."""
    fornecedor = obter_fornecedor(db, fornecedor_id)

    if "cnpj" in dados:
        cnpj = normalizar_cnpj(dados["cnpj"])
        if _cnpj_em_uso(db, cnpj, ignorar_id=fornecedor.id):
            raise CnpjJaCadastradoError(cnpj)
        fornecedor.cnpj = cnpj
    if "nome" in dados:
        fornecedor.nome = dados["nome"].strip()

    return _salvar(db, fornecedor, fornecedor.cnpj)
