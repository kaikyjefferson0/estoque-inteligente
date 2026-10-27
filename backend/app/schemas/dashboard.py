from datetime import date, datetime

from pydantic import BaseModel


class RecentMovementOut(BaseModel):
    id: int
    tipo: str
    quantidade: int
    produto_id: int
    produto_nome: str
    lote_id: int
    validade: date | None
    usuario_nome: str
    criado_em: datetime


class DashboardOut(BaseModel):
    """RN-45: números calculados na hora a partir dos lotes (RN-44)."""

    total_produtos: int
    # RN-13 e RN-41: saldo disponível <= mínimo; inclui os sem estoque (CT-50)
    produtos_estoque_baixo: int
    # Saldo disponível zero
    produtos_sem_estoque: int
    # RN-14: lotes com quantidade que vencem dentro dos dias de antecedência
    lotes_a_vencer: int
    # RN-15: lotes com quantidade e validade já passada
    lotes_vencidos: int
    alertas_ativos: int
    # As 5 mais recentes, da mais nova para a mais antiga
    ultimas_movimentacoes: list[RecentMovementOut]
