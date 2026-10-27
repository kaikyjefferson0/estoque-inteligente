from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

MAX_INTEGER = 2_147_483_647  # limite da coluna INTEGER do PostgreSQL

Nome = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
CodigoBarras = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
EstoqueMinimo = Annotated[int, Field(ge=0, le=MAX_INTEGER)]
# O valor > 0 e a coerência com controla_validade (RN-26) são checados no service
DiasAlerta = Annotated[int, Field(le=MAX_INTEGER)]
FornecedorId = Annotated[int, Field(ge=1, le=MAX_INTEGER)]


class ProductCreate(BaseModel):
    """RN-05: estoque mínimo, controle de validade e dias de alerta."""

    model_config = ConfigDict(extra="forbid")

    nome: Nome
    codigo_barras: CodigoBarras
    estoque_minimo: EstoqueMinimo
    controla_validade: bool = False
    dias_alerta_validade: DiasAlerta | None = None
    fornecedor_id: FornecedorId | None = None


class ProductUpdate(BaseModel):
    """Envie só os campos a alterar. dias_alerta_validade e fornecedor_id aceitam null."""

    model_config = ConfigDict(extra="forbid")

    nome: Nome | None = None
    codigo_barras: CodigoBarras | None = None
    estoque_minimo: EstoqueMinimo | None = None
    controla_validade: bool | None = None
    dias_alerta_validade: DiasAlerta | None = None
    fornecedor_id: FornecedorId | None = None

    @model_validator(mode="after")
    def campos_obrigatorios_nao_nulos(self):
        anulaveis = {"dias_alerta_validade", "fornecedor_id"}
        nulos = [
            campo for campo in self.model_fields_set if campo not in anulaveis and getattr(self, campo) is None
        ]
        if nulos:
            raise ValueError(f"Preencha ou retire do envio: {', '.join(sorted(nulos))}.")
        return self


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    codigo_barras: str
    estoque_minimo: int
    controla_validade: bool
    dias_alerta_validade: int | None
    fornecedor_id: int | None
    criado_em: datetime
