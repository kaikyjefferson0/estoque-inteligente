"""Regras de estoque em Python puro: sem Session, sem banco e sem ler o relógio (a data entra como parâmetro).

Só decidem a partir dos valores recebidos, para serem testadas sem banco (tests/unit). As mesmas
condições existem em SQL em app.services.condicoes, que é o que os alertas, a lista de estoque e o
dashboard usam nas consultas agregadas (RN-44). As duas versões têm que dar o mesmo resultado
para todo valor que o banco aceita (negativo, que as CHECKs recusam, aqui é erro):
o CT-110 (tests/test_regras_sql.py) compara as duas nos mesmos valores-limite. Ao mudar uma, mude a outra.
"""

from datetime import date

SITUACAO_OK = "ok"
SITUACAO_BAIXO = "baixo"
SITUACAO_SEM_ESTOQUE = "sem_estoque"

LOTE_OK = "ok"
LOTE_A_VENCER = "a_vencer"
LOTE_VENCIDO = "vencido"


def situacao_estoque(disponivel: int, minimo: int) -> str:
    """RN-13 e RN-41: baixo quando o saldo disponível é igual ou menor que o mínimo.

    Sem estoque (disponível zero) vem antes de baixo, mesmo com mínimo zero (CT-50).
    Negativo é erro de quem chamou: nem o saldo (RN-09) nem o mínimo podem ser negativos.
    """
    if disponivel < 0 or minimo < 0:
        raise ValueError("O saldo disponível e o estoque mínimo não podem ser negativos.")
    if disponivel == 0:
        return SITUACAO_SEM_ESTOQUE
    if disponivel <= minimo:
        return SITUACAO_BAIXO
    return SITUACAO_OK


def dias_para_vencer(validade: date | None, hoje: date) -> int | None:
    """Dias até a validade: 0 = vence hoje, negativo = já venceu, None = lote sem validade."""
    if validade is None:
        return None
    return (validade - hoje).days


def lote_disponivel(validade: date | None, hoje: date) -> bool:
    """RN-36: lote sem validade ou dentro da validade (vencer hoje ainda vale)."""
    dias = dias_para_vencer(validade, hoje)
    return dias is None or dias >= 0


def situacao_lote(
    quantidade: int, validade: date | None, hoje: date, *, controla_validade: bool, dias_alerta: int | None
) -> str:
    """RN-14 e RN-15: vencido se a validade já passou; a vencer de hoje até hoje + dias de alerta, inclusive.

    RN-42: lote zerado fica de fora (ok), como o lote sem validade.
    """
    if quantidade < 0:
        raise ValueError("A quantidade do lote não pode ser negativa.")
    dias = dias_para_vencer(validade, hoje)
    if quantidade == 0 or dias is None:
        return LOTE_OK
    if dias < 0:
        return LOTE_VENCIDO
    if controla_validade and dias_alerta is not None and dias <= dias_alerta:
        return LOTE_A_VENCER
    return LOTE_OK
