from sqlalchemy import exists, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.product import Product
from app.models.supplier import Supplier
from app.schemas.products import normalizar_codigo_barras
from app.services import alerts as alertas
from app.services.paginacao import padrao_de_busca, paginar
from app.services.teto_demo import TetoDoDemoError, conferir_teto  # noqa: F401  (a rota trata o erro)

CAMPOS_EDITAVEIS = (
    "nome",
    "codigo_barras",
    "estoque_minimo",
    "controla_validade",
    "dias_alerta_validade",
    "fornecedor_id",
)


class CodigoBarrasJaCadastradoError(Exception):
    pass


class ProdutoNaoEncontradoError(Exception):
    pass


class FornecedorInexistenteError(Exception):
    """RN-24: o fornecedor informado no produto não existe."""


class DiasAlertaInvalidoError(Exception):
    """RN-26."""


class ControlaValidadeBloqueadoError(Exception):
    """RN-30: produto com lote não pode mudar "controla validade"."""


def _validar_validade(controla_validade: bool, dias_alerta_validade: int | None) -> None:
    """RN-26: controla validade -> dias obrigatórios e > 0; senão, vazios."""
    if controla_validade:
        if dias_alerta_validade is None or dias_alerta_validade <= 0:
            raise DiasAlertaInvalidoError(
                "Informe em quantos dias antes de vencer o alerta deve aparecer, maior que zero."
            )
    elif dias_alerta_validade is not None:
        raise DiasAlertaInvalidoError("Dias de alerta só valem para produto que controla validade. Deixe o campo vazio.")


def _validar_fornecedor(db: Session, fornecedor_id: int | None) -> None:
    """RN-24: o fornecedor é opcional, mas se informado precisa existir."""
    if fornecedor_id is not None and db.get(Supplier, fornecedor_id) is None:
        raise FornecedorInexistenteError(fornecedor_id)


def _codigo_em_uso(db: Session, codigo_barras: str, ignorar_id: int | None = None) -> bool:
    consulta = select(Product.id).where(Product.codigo_barras == codigo_barras)
    if ignorar_id is not None:
        consulta = consulta.where(Product.id != ignorar_id)
    return db.scalar(consulta) is not None


def _salvar(db: Session, produto: Product, codigo_barras: str) -> Product:
    try:
        db.flush()
        # RN-40: mínimo ou dias de alerta podem ter mudado; alertas na mesma transação
        alertas.gerar_alertas_produto(db, produto.id)
        db.commit()
    except IntegrityError as erro:
        db.rollback()
        # Outro cadastro com o mesmo código entrou entre a busca e o commit (RN-04)
        if getattr(getattr(erro.orig, "diag", None), "constraint_name", None) == "ix_products_codigo_barras":
            raise CodigoBarrasJaCadastradoError(codigo_barras)
        raise
    except Exception:
        db.rollback()
        raise
    db.refresh(produto)
    return produto


def criar_produto(
    db: Session,
    nome: str,
    codigo_barras: str,
    estoque_minimo: int,
    controla_validade: bool = False,
    dias_alerta_validade: int | None = None,
    fornecedor_id: int | None = None,
) -> Product:
    codigo_barras = normalizar_codigo_barras(codigo_barras)  # RN-04
    conferir_teto(db, Product, "produtos")  # RN-57
    _validar_validade(controla_validade, dias_alerta_validade)
    _validar_fornecedor(db, fornecedor_id)
    if _codigo_em_uso(db, codigo_barras):
        raise CodigoBarrasJaCadastradoError(codigo_barras)

    produto = Product(
        nome=nome.strip(),
        codigo_barras=codigo_barras,
        estoque_minimo=estoque_minimo,
        controla_validade=controla_validade,
        dias_alerta_validade=dias_alerta_validade,
        fornecedor_id=fornecedor_id,
    )
    db.add(produto)
    return _salvar(db, produto, codigo_barras)


def obter_por_codigo(db: Session, codigo_barras: str) -> Product:
    """Busca exata pelo código de barras (RN-04: é único e sem espaços), usada pela leitura na entrada e na saída."""
    codigo = normalizar_codigo_barras(codigo_barras)
    produto = db.scalar(select(Product).where(Product.codigo_barras == codigo)) if codigo else None
    if produto is None:
        raise ProdutoNaoEncontradoError(codigo)
    return produto


def filtro_nome_ou_codigo(nome, codigo_barras, termo: str):
    """RN-51 e RN-04: o nome é comparado com o termo como veio ("Leite integral"); o código de
    barras, com o termo sem espaços, porque é guardado sem eles ("3037 3543" acha "30373543")."""
    return or_(
        nome.ilike(padrao_de_busca(termo), escape="\\"),
        codigo_barras.ilike(padrao_de_busca(normalizar_codigo_barras(termo)), escape="\\"),
    )


def listar_produtos(db: Session, limite: int, deslocamento: int, busca: str | None = None) -> dict:
    """Uma página de produtos (RN-51); `busca` filtra por parte do nome ou do código de barras."""
    consulta = select(Product).order_by(Product.id)
    termo = (busca or "").strip()
    if termo:
        consulta = consulta.where(filtro_nome_ou_codigo(Product.nome, Product.codigo_barras, termo))
    pagina = paginar(db, consulta, limite, deslocamento)
    return pagina.com_itens([linha[0] for linha in pagina.linhas])


def obter_produto(db: Session, produto_id: int, travar: bool = False) -> Product:
    produto = db.get(Product, produto_id, with_for_update=travar or None, populate_existing=travar)
    if produto is None:
        raise ProdutoNaoEncontradoError(produto_id)
    return produto


def atualizar_produto(db: Session, produto_id: int, dados: dict) -> Product:
    """Altera os campos enviados. As regras valem para o estado final do produto."""
    # Ordem das travas igual à das movimentações: produto (consultiva) -> linha do produto
    alertas.travar_produto(db, produto_id)
    # FOR UPDATE: espera entradas em andamento (que travam o produto com FOR SHARE) para a RN-30
    produto = obter_produto(db, produto_id, travar=True)
    dados = {campo: valor for campo, valor in dados.items() if campo in CAMPOS_EDITAVEIS}
    if "codigo_barras" in dados:
        dados["codigo_barras"] = normalizar_codigo_barras(dados["codigo_barras"])  # RN-04
    if "nome" in dados:
        dados["nome"] = dados["nome"].strip()

    # RN-30 antes da RN-26: se a mudança é proibida, o usuário sabe logo (409)
    if dados.get("controla_validade", produto.controla_validade) != produto.controla_validade and db.scalar(
        select(exists().where(Batch.produto_id == produto.id))
    ):
        raise ControlaValidadeBloqueadoError(produto.id)
    _validar_validade(
        dados.get("controla_validade", produto.controla_validade),
        dados.get("dias_alerta_validade", produto.dias_alerta_validade),
    )
    if "fornecedor_id" in dados:
        _validar_fornecedor(db, dados["fornecedor_id"])
    if "codigo_barras" in dados and _codigo_em_uso(db, dados["codigo_barras"], ignorar_id=produto.id):
        raise CodigoBarrasJaCadastradoError(dados["codigo_barras"])

    for campo, valor in dados.items():
        setattr(produto, campo, valor)
    return _salvar(db, produto, produto.codigo_barras)
