"""Tipos de entrada que valem para toda a API: ids da URL e textos sem o caractere NUL (RN-61 e RN-62)."""

from typing import Annotated

from fastapi import Path
from pydantic import BaseModel, BeforeValidator, ConfigDict, field_validator
from pydantic_core import PydanticCustomError

MAX_INTEGER = 2_147_483_647  # limite da coluna INTEGER do PostgreSQL

# RN-61: id na URL (/products/{id}, /suppliers/{id}, /users/{id}...). Fora de 1 a MAX_INTEGER é 422
# antes de chegar ao banco, que daria erro (500) com um número que não cabe no INTEGER.
IdNaUrl = Annotated[int, Path(ge=1, le=MAX_INTEGER)]

MENSAGEM_NUL = "O texto tem um caractere invisível que não é aceito (NUL). Apague e digite de novo."


def recusar_nul(valor: object) -> object:
    """RN-62: o PostgreSQL não guarda o caractere NUL em texto e responderia com erro (500).
    O que não é texto segue igual para a validação do próprio campo."""
    if isinstance(valor, str) and "\x00" in valor:
        raise PydanticCustomError("texto_com_nul", MENSAGEM_NUL)
    return valor


# RN-62: para textos que não estão num schema de corpo (busca, código de barras na URL, formulário de login)
SemNul = BeforeValidator(recusar_nul)


class EntradaBase(BaseModel):
    """Base de todo schema de corpo de requisição: recusa campo desconhecido e, em todos os campos
    de texto, o caractere NUL (RN-62). Um campo novo fica protegido sem precisar lembrar dele."""

    model_config = ConfigDict(extra="forbid")

    @field_validator("*", mode="before")
    @classmethod
    def _sem_nul(cls, valor: object) -> object:
        return recusar_nul(valor)
