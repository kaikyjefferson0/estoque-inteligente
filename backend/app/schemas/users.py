from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, model_validator

SENHA_MINIMA = 8
SENHA_MAXIMA = 128

Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Perfil = Literal["admin", "operador"]  # RN-01
SenhaNova = Annotated[str, Field(min_length=SENHA_MINIMA, max_length=SENHA_MAXIMA)]


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: Nome
    email: EmailStr
    senha: SenhaNova
    perfil: Perfil


class UserUpdate(BaseModel):
    """Só nome, perfil e ativo podem ser alterados; qualquer outro campo é recusado."""

    model_config = ConfigDict(extra="forbid")

    nome: Nome | None = None
    perfil: Perfil | None = None
    ativo: bool | None = None

    @model_validator(mode="after")
    def campos_enviados_nao_nulos(self):
        nulos = [campo for campo in self.model_fields_set if getattr(self, campo) is None]
        if nulos:
            raise ValueError(f"Preencha ou retire do envio: {', '.join(sorted(nulos))}.")
        return self


class UserPasswordIn(BaseModel):
    """RN-49: o admin define a nova senha de outro usuário."""

    model_config = ConfigDict(extra="forbid")

    senha_nova: SenhaNova


class UserOut(BaseModel):
    """Saída de usuário. Nunca inclui senha_hash."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    perfil: Perfil
    ativo: bool
    criado_em: datetime
