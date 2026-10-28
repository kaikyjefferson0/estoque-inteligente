from dataclasses import dataclass
from typing import Annotated

from fastapi import Query
from pydantic import BaseModel

from app.schemas.products import MAX_INTEGER

# RN-51: 50 por página, no máximo 200
LIMITE_PADRAO = 50
LIMITE_MAXIMO = 200


class Pagina[T](BaseModel):
    """RN-51: uma página da lista; `total` conta todos os itens que passam nos filtros."""

    itens: list[T]
    total: int
    limite: int
    deslocamento: int


@dataclass(frozen=True)
class Paginacao:
    limite: int
    deslocamento: int


def paginacao(
    limite: Annotated[int, Query(ge=1, le=LIMITE_MAXIMO, description="Itens por página (até 200)")] = LIMITE_PADRAO,
    deslocamento: Annotated[int, Query(ge=0, le=MAX_INTEGER, description="Quantos itens pular")] = 0,
) -> Paginacao:
    """Parâmetros de página das listas (RN-51). Acima de 200 a API responde 422 (CT-66)."""
    return Paginacao(limite=limite, deslocamento=deslocamento)
