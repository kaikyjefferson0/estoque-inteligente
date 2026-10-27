from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

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


SituacaoLote = Literal["ok", "a_vencer", "vencido"]


class BatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    validade: date | None
    quantidade: int
    # RN-14, RN-15 e RN-44: as mesmas condições dos alertas, com o "hoje" de Brasília
    situacao: SituacaoLote


class ProductStockOut(BaseModel):
    produto_id: int
    # Soma de todos os lotes, vencidos inclusive
    saldo_fisico: int
    # RN-36: só lotes dentro da validade; é o que pode sair
    saldo_disponivel: int
    # Ordem FEFO: validade mais próxima primeiro; lote sem validade por último
    lotes: list[BatchOut]


class MovementOut(BaseModel):
    id: int
    tipo: str
    quantidade: int
    lote_id: int
    validade: date | None
    motivo: str | None
    # RN-34: preenchidos só nas linhas de ajuste
    saldo_anterior: int | None
    saldo_novo: int | None
    usuario_id: int
    usuario_nome: str
    criado_em: datetime


class StockExitCreate(BaseModel):
    """Saída de estoque. FEFO e saldo (RN-09, RN-10, RN-36) são checados no service."""

    model_config = ConfigDict(extra="forbid")

    codigo_barras: CodigoBarras
    # RN-07: quantidade maior que zero
    quantidade: Annotated[int, Field(gt=0, le=MAX_INTEGER)]


class ExitBatchOut(BaseModel):
    movimentacao_id: int
    lote_id: int
    validade: date | None
    quantidade: int
    quantidade_lote: int


class StockExitOut(BaseModel):
    produto_id: int
    quantidade: int
    # Uma linha por lote atingido, em ordem FEFO
    lotes: list[ExitBatchOut]
    saldo_total: int
    usuario_id: int
    criado_em: datetime


# RN-11: motivo obrigatório; só espaços vira vazio e é recusado. 255 = tamanho da coluna
Motivo = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class StockAdjustmentCreate(BaseModel):
    """Ajuste de estoque (RN-33): o admin informa o saldo contado do lote."""

    model_config = ConfigDict(extra="forbid")

    lote_id: Annotated[int, Field(ge=1, le=MAX_INTEGER)]
    # RN-35: o saldo contado nunca é negativo
    saldo_contado: Annotated[int, Field(ge=0, le=MAX_INTEGER)]
    motivo: Motivo


class StockAdjustmentOut(BaseModel):
    movimentacao_id: int
    produto_id: int
    lote_id: int
    validade: date | None
    # Diferença aplicada (saldo_novo - saldo_anterior); negativa quando o saldo diminui
    quantidade: int
    saldo_anterior: int
    saldo_novo: int
    motivo: str
    saldo_total: int
    usuario_id: int
    criado_em: datetime


Situacao = Literal["ok", "baixo", "sem_estoque"]


class StockItemOut(BaseModel):
    """CT-48: uma linha da lista de estoque."""

    produto_id: int
    nome: str
    codigo_barras: str
    saldo_fisico: int
    saldo_disponivel: int
    estoque_minimo: int
    # sem_estoque: disponível zero; baixo: disponível <= mínimo (RN-13, RN-41)
    situacao: Situacao
