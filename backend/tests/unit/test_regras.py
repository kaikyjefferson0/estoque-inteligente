"""Regras de negócio sem banco, nos valores-limite: se a regra muda em 5, testa 4, 5 e 6."""

from datetime import date

import pytest
from pydantic import TypeAdapter, ValidationError

from app.core import database
from app.models.batch import Batch
from app.schemas.products import MENSAGEM_DIAS_ALERTA, CodigoBarras, DiasAlerta, normalizar_codigo_barras
from app.services.products import DiasAlertaInvalidoError, _validar_validade
from app.services.regras import dias_para_vencer, lote_disponivel, situacao_estoque, situacao_lote
from app.services.stock import _ordem_fefo
from app.services.suppliers import CnpjInvalidoError, normalizar_cnpj
from tests.casos_regras import CASOS_DISPONIVEL, CASOS_ESTOQUE, CASOS_LOTE, CASOS_LOTE_SO_PYTHON, HOJE, em


def test_conexao_com_o_banco_e_recusada():
    """Contraprova da trava de tests/unit/conftest.py."""
    with pytest.raises(AssertionError, match="tentou conectar no banco"):
        database.engine.connect()


# --- CT-104: situação do estoque (RN-13 e RN-41) ---


@pytest.mark.parametrize("disponivel, minimo, esperada", CASOS_ESTOQUE)
def test_ct104_situacao_do_estoque(disponivel, minimo, esperada):
    assert situacao_estoque(disponivel, minimo) == esperada


@pytest.mark.parametrize(
    "disponivel, minimo",
    [pytest.param(-1, 5, id="disponivel_negativo"), pytest.param(5, -1, id="minimo_negativo")],
)
def test_ct104_negativo_e_recusado(disponivel, minimo):
    with pytest.raises(ValueError, match="não podem ser negativos"):
        situacao_estoque(disponivel, minimo)


# --- CT-105: validade do lote (RN-14, RN-15, RN-36 e RN-42) ---


@pytest.mark.parametrize(
    "validade, esperado",
    [
        pytest.param(em(-1), -1, id="venceu_ontem"),
        pytest.param(em(0), 0, id="vence_hoje"),
        pytest.param(em(1), 1, id="vence_amanha"),
        pytest.param(None, None, id="sem_validade"),
    ],
)
def test_ct105_dias_para_vencer(validade, esperado):
    assert dias_para_vencer(validade, HOJE) == esperado


def test_ct105_dias_para_vencer_conta_o_29_de_fevereiro():
    assert dias_para_vencer(date(2028, 3, 1), date(2028, 2, 28)) == 2
    assert dias_para_vencer(date(2027, 3, 1), date(2027, 2, 28)) == 1


@pytest.mark.parametrize("validade, esperado", CASOS_DISPONIVEL)
def test_ct105_lote_disponivel_para_saida(validade, esperado):
    assert lote_disponivel(validade, HOJE) is esperado


@pytest.mark.parametrize("quantidade, validade, controla, dias_alerta, esperada", CASOS_LOTE + CASOS_LOTE_SO_PYTHON)
def test_ct105_situacao_do_lote(quantidade, validade, controla, dias_alerta, esperada):
    situacao = situacao_lote(quantidade, validade, HOJE, controla_validade=controla, dias_alerta=dias_alerta)
    assert situacao == esperada


def test_ct105_quantidade_negativa_e_recusada():
    with pytest.raises(ValueError, match="não pode ser negativa"):
        situacao_lote(-1, em(0), HOJE, controla_validade=True, dias_alerta=30)


# --- CT-106: ordem FEFO (RN-10) ---


@pytest.mark.parametrize(
    "lotes, ordem_esperada",
    [
        pytest.param([], [], id="lista_vazia"),
        pytest.param([(1, em(5))], [1], id="um_lote"),
        pytest.param([(1, em(6)), (2, em(5)), (3, em(4))], [3, 2, 1], id="um_dia_de_diferenca"),
        pytest.param([(9, em(5)), (2, em(5))], [2, 9], id="mesma_validade_desempata_pelo_id"),
        pytest.param([(1, None), (2, em(3650))], [2, 1], id="sem_validade_por_ultimo"),
        pytest.param([(7, None), (3, None)], [3, 7], id="dois_sem_validade_pelo_id"),
    ],
)
def test_ct106_ordem_fefo(lotes, ordem_esperada):
    # Batch fora de qualquer sessão: só um objeto Python
    ordem = _ordem_fefo([Batch(id=id_, validade=validade, quantidade=1) for id_, validade in lotes])
    assert [lote.id for lote in ordem] == ordem_esperada


# --- CT-107: CNPJ (RN-06 e RN-25) ---


@pytest.mark.parametrize(
    "cnpj, esperado",
    [
        pytest.param("11222333000181", "11222333000181", id="14_digitos"),
        pytest.param("11.222.333/0001-81", "11222333000181", id="14_digitos_com_pontuacao"),
        pytest.param(" 11222333000181 ", "11222333000181", id="14_digitos_com_espacos"),
        pytest.param(None, None, id="nao_informado"),
        pytest.param("", None, id="vazio"),
        pytest.param("   ", None, id="so_espacos"),
    ],
)
def test_ct107_cnpj_aceito(cnpj, esperado):
    assert normalizar_cnpj(cnpj) == esperado


@pytest.mark.parametrize(
    "cnpj",
    [
        pytest.param("1122233300018", id="13_digitos"),
        pytest.param("112223330001811", id="15_digitos"),
        pytest.param("1122233300018A", id="13_digitos_e_letra"),
        pytest.param("../-", id="so_pontuacao"),
        pytest.param("\u0661" * 14, id="14_digitos_nao_ascii"),
    ],
)
def test_ct107_cnpj_recusado(cnpj):
    with pytest.raises(CnpjInvalidoError, match="14 números"):
        normalizar_cnpj(cnpj)


# --- CT-108: dias de alerta (RN-26), no service e no schema ---


@pytest.mark.parametrize("dias", [1, 3650])
def test_ct108_dias_de_alerta_aceitos(dias):
    _validar_validade(True, dias)  # não levanta erro
    assert TypeAdapter(DiasAlerta).validate_python(dias) == dias


@pytest.mark.parametrize("dias", [-1, 0, 3651])
def test_ct108_dias_de_alerta_recusados(dias):
    with pytest.raises(DiasAlertaInvalidoError) as erro:
        _validar_validade(True, dias)
    assert str(erro.value) == MENSAGEM_DIAS_ALERTA
    with pytest.raises(ValidationError) as erro_schema:
        TypeAdapter(DiasAlerta).validate_python(dias)
    assert erro_schema.value.errors()[0]["msg"] == MENSAGEM_DIAS_ALERTA


def test_ct108_produto_que_controla_validade_exige_os_dias():
    with pytest.raises(DiasAlertaInvalidoError, match="Informe em quantos dias"):
        _validar_validade(True, None)


def test_ct108_produto_sem_controle_nao_tem_dias():
    _validar_validade(False, None)  # não levanta erro
    for dias in (0, 1):
        with pytest.raises(DiasAlertaInvalidoError, match="só valem para produto que controla validade"):
            _validar_validade(False, dias)


# --- CT-109: código de barras (RN-04) ---


@pytest.mark.parametrize(
    "codigo, esperado",
    [
        pytest.param("30373543", "30373543", id="sem_espaco"),
        pytest.param(" 3037 3543 ", "30373543", id="espacos"),
        pytest.param("3037\t35\r\n43", "30373543", id="tabulacao_e_quebra_de_linha"),
        pytest.param("3037\u00a03543", "30373543", id="espaco_inseparavel"),
        pytest.param(" \t\n\u00a0", "", id="so_espacos"),
    ],
)
def test_ct109_codigo_de_barras_sem_espacos(codigo, esperado):
    assert normalizar_codigo_barras(codigo) == esperado


@pytest.mark.parametrize(
    "codigo, esperado",
    [
        pytest.param("7", "7", id="1_caractere"),
        pytest.param("7" * 49, "7" * 49, id="49_caracteres"),
        pytest.param("7" * 50, "7" * 50, id="50_caracteres"),
        pytest.param(" " + "7" * 25 + " " + "7" * 25, "7" * 50, id="50_caracteres_mais_espacos"),
    ],
)
def test_ct109_tamanho_do_codigo_aceito(codigo, esperado):
    assert TypeAdapter(CodigoBarras).validate_python(codigo) == esperado


@pytest.mark.parametrize(
    "codigo, tipo_do_erro",
    [
        pytest.param("", "too_short", id="vazio"),
        pytest.param(" \u00a0", "too_short", id="so_espacos"),
        pytest.param("7" * 51, "too_long", id="51_caracteres"),
    ],
)
def test_ct109_tamanho_do_codigo_recusado(codigo, tipo_do_erro):
    with pytest.raises(ValidationError) as erro:
        TypeAdapter(CodigoBarras).validate_python(codigo)
    assert erro.value.errors()[0]["type"] == tipo_do_erro
