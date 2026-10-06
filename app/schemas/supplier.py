from pydantic import BaseModel, ConfigDict


class SupplierCreate(BaseModel):
    name: str
    cnpj: str | None = None


class SupplierResponse(BaseModel):
    id: int
    name: str
    cnpj: str | None = None

    model_config = ConfigDict(from_attributes=True)
    