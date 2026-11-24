"""Valores-limite das situações de estoque e de lote.

Ficam aqui para o teste unitário (tests/unit/test_regras.py, a regra em Python) e o de integração
(tests/test_regras_sql.py, a mesma regra em SQL) usarem exatamente os mesmos casos.
"""

from datetime import date, timedelta

import pytest

HOJE = date(2026, 3, 15)
DIAS_ALERTA = 30


def em(dias: int) -> date:
    return HOJE + timedelta(days=dias)


# disponivel, minimo, situação esperada
CASOS_ESTOQUE = [
    pytest.param(0, 0, "sem_estoque", id="disponivel_0_minimo_0"),
    pytest.param(0, 5, "sem_estoque", id="disponivel_0_minimo_5"),
    pytest.param(1, 0, "ok", id="disponivel_1_minimo_0"),
    pytest.param(1, 5, "baixo", id="disponivel_1_minimo_5"),
    pytest.param(4, 5, "baixo", id="minimo_menos_1"),
    pytest.param(5, 5, "baixo", id="igual_ao_minimo"),
    pytest.param(6, 5, "ok", id="minimo_mais_1"),
]

# quantidade, validade, controla_validade, dias_alerta, situação esperada
CASOS_LOTE = [
    pytest.param(1, em(-1), True, DIAS_ALERTA, "vencido", id="venceu_ontem"),
    pytest.param(1, em(0), True, DIAS_ALERTA, "a_vencer", id="vence_hoje"),
    pytest.param(1, em(1), True, DIAS_ALERTA, "a_vencer", id="vence_amanha"),
    pytest.param(1, em(DIAS_ALERTA - 1), True, DIAS_ALERTA, "a_vencer", id="hoje_mais_dias_alerta_menos_1"),
    pytest.param(1, em(DIAS_ALERTA), True, DIAS_ALERTA, "a_vencer", id="hoje_mais_dias_alerta"),
    pytest.param(1, em(DIAS_ALERTA + 1), True, DIAS_ALERTA, "ok", id="hoje_mais_dias_alerta_mais_1"),
    pytest.param(1, em(1), True, 1, "a_vencer", id="alerta_de_1_dia_no_limite"),
    pytest.param(1, em(2), True, 1, "ok", id="alerta_de_1_dia_passou_do_limite"),
    pytest.param(1, em(3650), True, 3650, "a_vencer", id="alerta_de_3650_dias_no_limite"),
    pytest.param(1, em(3651), True, 3650, "ok", id="alerta_de_3650_dias_passou_do_limite"),
    pytest.param(0, em(-1), True, DIAS_ALERTA, "ok", id="quantidade_0_vencido"),
    pytest.param(0, em(0), True, DIAS_ALERTA, "ok", id="quantidade_0_vence_hoje"),
    pytest.param(1, None, True, DIAS_ALERTA, "ok", id="sem_validade"),
    pytest.param(1, None, False, None, "ok", id="sem_validade_produto_sem_controle"),
    # Não acontece pela API (RN-27 e RN-31), mas o SQL e o Python precisam concordar também aqui
    pytest.param(1, em(0), False, None, "ok", id="vence_hoje_produto_sem_controle"),
    pytest.param(1, em(-1), False, None, "vencido", id="venceu_ontem_produto_sem_controle"),
]

# Só no teste unitário: a CHECK ck_products_dias_alerta_validade recusa estas combinações no banco
CASOS_LOTE_SO_PYTHON = [
    pytest.param(1, em(0), False, DIAS_ALERTA, "ok", id="sem_controle_mas_com_dias"),
    pytest.param(1, em(0), True, None, "ok", id="com_controle_mas_sem_dias"),
]

# validade, disponível para saída
CASOS_DISPONIVEL = [
    pytest.param(em(-1), False, id="venceu_ontem"),
    pytest.param(em(0), True, id="vence_hoje"),
    pytest.param(em(1), True, id="vence_amanha"),
    pytest.param(None, True, id="sem_validade"),
]
