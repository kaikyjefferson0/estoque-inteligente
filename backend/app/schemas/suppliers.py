from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
# Aceita com ou sem pontuação; o service valida e guarda só os 14 números (RN-25)
CnpjEntrada = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20)]


class SupplierCreate(BaseModel):
    """RN-06: só o nome é obrigatório."""

    model_config = ConfigDict(extra="forbid")

    nome: Nome
    cnpj: CnpjEntrada | None = None


class SupplierUpdate(BaseModel):
    """Só nome e CNPJ podem ser alterados; cnpj null remove o CNPJ."""

    model_config = ConfigDict(extra="forbid")

    nome: Nome | None = None
    cnpj: CnpjEntrada | None = None

    @model_validator(mode="after")
    def nome_enviado_nao_nulo(self):
        if "nome" in self.model_fields_set and self.nome is None:
            raise ValueError("Campo não pode ser nulo: nome")
        return self


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    cnpj: str | None
    criado_em: datetime
