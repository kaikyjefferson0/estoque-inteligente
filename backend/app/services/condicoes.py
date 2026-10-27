"""RN-44: condições únicas de estoque, usadas pelos alertas, pela lista de estoque e pelo dashboard.

São expressões SQL (SQLAlchemy), para servirem tanto à consulta de um produto (alertas)
quanto às consultas agregadas de todos os produtos (lista e dashboard). `dia` é o "hoje"
em Brasília (app.core.clock.hoje), passado por quem chama para todas as condições
de uma mesma consulta usarem o mesmo dia.
"""

from datetime import date

from sqlalchemy import Date, and_, case, func, literal, or_, select
from sqlalchemy.sql.elements import ColumnElement

from app.models.batch import Batch
from app.models.product import Product

SITUACAO_OK = "ok"
SITUACAO_BAIXO = "baixo"
SITUACAO_SEM_ESTOQUE = "sem_estoque"


def lote_disponivel(dia: date) -> ColumnElement[bool]:
    """RN-36: lote sem validade ou dentro da validade (vencer hoje ainda vale)."""
    return or_(Batch.validade.is_(None), Batch.validade >= dia)


def lote_vencido(dia: date) -> ColumnElement[bool]:
    """RN-15: a validade já passou. RN-42: lote zerado fica de fora."""
    return and_(Batch.quantidade > 0, Batch.validade < dia)


def lote_a_vencer(dia: date) -> ColumnElement[bool]:
    """RN-14: vence de hoje até hoje + dias de antecedência do produto. RN-42: lote zerado fica de fora.

    Exige o join com Product (controla_validade e dias_alerta_validade).
    """
    return and_(
        Product.controla_validade.is_(True),
        Batch.quantidade > 0,
        Batch.validade >= dia,
        Batch.validade <= literal(dia, Date) + Product.dias_alerta_validade,
    )


def saldo_fisico() -> ColumnElement[int]:
    """Soma de todos os lotes, vencidos inclusive (agregação sobre Batch)."""
    return func.coalesce(func.sum(Batch.quantidade), 0)


def saldo_disponivel(dia: date) -> ColumnElement[int]:
    """RN-36 e RN-41: soma só dos lotes disponíveis (agregação sobre Batch)."""
    return func.coalesce(func.sum(case((lote_disponivel(dia), Batch.quantidade), else_=0)), 0)


def estoque_baixo(disponivel, minimo) -> ColumnElement[bool]:
    """RN-13 e RN-41: saldo disponível igual ou menor que o mínimo."""
    return disponivel <= minimo


def situacao(disponivel, minimo) -> ColumnElement[str]:
    """Sem estoque (disponível zero) vem antes de baixo; quem está sem estoque também está baixo (CT-50)."""
    return case(
        (disponivel == 0, SITUACAO_SEM_ESTOQUE),
        (estoque_baixo(disponivel, minimo), SITUACAO_BAIXO),
        else_=SITUACAO_OK,
    )


def saldos_por_produto(dia: date):
    """Uma linha por produto (inclusive sem lotes) com os saldos, numa só consulta agregada.

    Colunas: produto_id, nome, codigo_barras, estoque_minimo, saldo_fisico, saldo_disponivel.
    """
    return (
        select(
            Product.id.label("produto_id"),
            Product.nome,
            Product.codigo_barras,
            Product.estoque_minimo,
            saldo_fisico().label("saldo_fisico"),
            saldo_disponivel(dia).label("saldo_disponivel"),
        )
        .outerjoin(Batch, Batch.produto_id == Product.id)
        # products.id é a chave primária: as outras colunas do produto dependem dela
        .group_by(Product.id)
    )
