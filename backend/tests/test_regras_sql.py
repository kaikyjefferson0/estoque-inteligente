"""CT-110: a regra em SQL (condicoes.py) e a regra em Python (regras.py) dão o mesmo resultado (RN-44)."""

import pytest
from sqlalchemy import Integer, literal, select

from app.models.batch import Batch
from app.models.product import Product
from app.services import condicoes, regras
from tests.casos_regras import CASOS_DISPONIVEL, CASOS_ESTOQUE, CASOS_LOTE, HOJE, em


def _criar_lote(db, quantidade, validade, controla, dias_alerta) -> Batch:
    # Direto no banco: a API recusaria entrada já vencida e lote que nasce com zero
    produto = Product(
        nome="Produto limite",
        codigo_barras="7891000000110",
        estoque_minimo=0,
        controla_validade=controla,
        dias_alerta_validade=dias_alerta,
    )
    db.add(produto)
    db.flush()
    lote = Batch(produto_id=produto.id, validade=validade, quantidade=quantidade)
    db.add(lote)
    db.flush()
    return lote


def _no_lote(db, lote, expressao):
    return db.execute(
        select(expressao).select_from(Batch).join(Product, Product.id == Batch.produto_id).where(Batch.id == lote.id)
    ).scalar_one()


@pytest.mark.parametrize("disponivel, minimo, esperada", CASOS_ESTOQUE)
def test_ct110_situacao_do_estoque_igual_em_sql_e_python(db, disponivel, minimo, esperada):
    sql = select(condicoes.situacao(literal(disponivel, Integer), literal(minimo, Integer)))
    assert db.execute(sql).scalar_one() == regras.situacao_estoque(disponivel, minimo) == esperada


@pytest.mark.parametrize("disponivel, minimo, esperada", CASOS_ESTOQUE)
def test_ct110_estoque_baixo_do_alerta_inclui_o_sem_estoque(db, disponivel, minimo, esperada):
    """O alerta e o dashboard usam estoque_baixo: verdadeiro em baixo e em sem_estoque (CT-50)."""
    sql = select(condicoes.estoque_baixo(literal(disponivel, Integer), literal(minimo, Integer)))
    em_python = regras.situacao_estoque(disponivel, minimo) != regras.SITUACAO_OK
    assert db.execute(sql).scalar_one() is em_python
    assert em_python is (esperada != "ok")


@pytest.mark.parametrize("quantidade, validade, controla, dias_alerta, esperada", CASOS_LOTE)
def test_ct110_situacao_do_lote_igual_em_sql_e_python(db, quantidade, validade, controla, dias_alerta, esperada):
    lote = _criar_lote(db, quantidade, validade, controla, dias_alerta)
    em_sql = _no_lote(db, lote, condicoes.situacao_do_lote(HOJE))
    em_python = regras.situacao_lote(quantidade, validade, HOJE, controla_validade=controla, dias_alerta=dias_alerta)
    assert em_sql == em_python == esperada


@pytest.mark.parametrize("quantidade, validade, controla, dias_alerta, esperada", CASOS_LOTE)
def test_ct110_condicoes_dos_alertas_de_lote_iguais_a_situacao(
    db, quantidade, validade, controla, dias_alerta, esperada
):
    """Os alertas usam lote_vencido e lote_a_vencer sozinhas, sem a ordem do CASE: nunca as duas juntas."""
    lote = _criar_lote(db, quantidade, validade, controla, dias_alerta)
    # bool(): com validade vazia, o SQL responde NULL, que num filtro vale como falso
    vencido = bool(_no_lote(db, lote, condicoes.lote_vencido(HOJE)))
    a_vencer = bool(_no_lote(db, lote, condicoes.lote_a_vencer(HOJE)))
    assert (vencido, a_vencer) == (esperada == "vencido", esperada == "a_vencer")


@pytest.mark.parametrize("validade, esperado", CASOS_DISPONIVEL)
def test_ct110_lote_disponivel_igual_em_sql_e_python(db, validade, esperado):
    lote = _criar_lote(db, 1, validade, validade is not None, 30 if validade else None)
    em_sql = _no_lote(db, lote, condicoes.lote_disponivel(HOJE))
    assert em_sql is regras.lote_disponivel(validade, HOJE) is esperado


def test_ct110_saldo_disponivel_soma_so_os_lotes_disponiveis(db):
    """RN-36 e RN-41: ontem fica de fora; hoje e amanhã contam."""
    lote = _criar_lote(db, 1, em(-1), True, 30)
    db.add_all([Batch(produto_id=lote.produto_id, validade=em(dias), quantidade=q) for dias, q in ((0, 10), (1, 100))])
    db.flush()
    linha = db.execute(condicoes.saldos_por_produto(HOJE).where(Product.id == lote.produto_id)).one()
    lotes = db.scalars(select(Batch).where(Batch.produto_id == lote.produto_id)).all()
    em_python = sum(item.quantidade for item in lotes if regras.lote_disponivel(item.validade, HOJE))
    assert linha.saldo_disponivel == em_python == 110
    assert linha.saldo_fisico == 111


def test_ct110_saldo_disponivel_com_lote_sem_validade_e_lote_zerado(db):
    lote = _criar_lote(db, 7, None, False, None)
    db.add(Batch(produto_id=lote.produto_id, validade=em(1), quantidade=0))
    db.flush()
    linha = db.execute(condicoes.saldos_por_produto(HOJE).where(Product.id == lote.produto_id)).one()
    assert (linha.saldo_disponivel, linha.saldo_fisico) == (7, 7)


def test_ct110_produto_sem_lotes_tem_saldo_zero_e_esta_sem_estoque(db, detergente):
    linha = db.execute(condicoes.saldos_por_produto(HOJE).where(Product.id == detergente.id)).one()
    assert (linha.saldo_disponivel, linha.saldo_fisico) == (0, 0)
    assert regras.situacao_estoque(linha.saldo_disponivel, linha.estoque_minimo) == "sem_estoque"
