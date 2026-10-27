from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

TipoAlerta = Literal["estoque_baixo", "vencimento_proximo", "vencido"]


class AlertOut(BaseModel):
    id: int
    tipo: TipoAlerta
    produto_id: int
    produto_nome: str
    # Vazios no estoque_baixo
    lote_id: int | None
    validade: date | None
    criado_em: datetime
    # RN-39: preenchido quando a condição deixou de existir
    resolvido_em: datetime | None


class AlertGenerationOut(BaseModel):
    criados: int
    resolvidos: int
