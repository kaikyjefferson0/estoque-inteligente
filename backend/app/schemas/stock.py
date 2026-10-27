from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.products import MAX_INTEGER, CodigoBarras


class StockEntryCreate(BaseModel):
    """Entrada de estoque. As regras de validade (RN-08, RN-31) são checadas no service."""

    model_config = ConfigDict(extra="forbid")

    codigo_barras: CodigoBarras
    # RN-07: quantidade maior que zero
    quantidade: Annotated[int, Field(gt=0, le=MAX_INTEGER)]
    validade: date | None = None


class StockEntryOut(BaseModel):
    movimentacao_id: int
    produto_id: int
    lote_id: int
    validade: date | None
    quantidade: int
    quantidade_lote: int
    saldo_total: int
    usuario_id: int
    criado_em: datetime


class BatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    validade: date | None
    quantidade: int


class ProductStockOut(BaseModel):
    produto_id: int
    saldo_total: int
    # Ordem FEFO: validade mais próxima primeiro; lote sem validade por último
    lotes: list[BatchOut]


class MovementOut(BaseModel):
    id: int
    tipo: str
    quantidade: int
    lote_id: int
    validade: date | None
    motivo: str | None
    usuario_id: int
    usuario_nome: str
    criado_em: datetime
