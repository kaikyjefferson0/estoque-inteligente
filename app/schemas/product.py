from pydantic import BaseModel, ConfigDict, Field


class ProductCreate(BaseModel):
    name: str
    barcode: str
    category_id: int | None = None
    supplier_id: int | None = None
    minimum_stock: int = Field(default=0, ge=0)
    controls_expiration: bool = False


class ProductResponse(BaseModel):
    id: int
    name: str
    barcode: str
    category_id: int | None
    supplier_id: int | None
    minimum_stock: int
    controls_expiration: bool
    active: bool

    model_config = ConfigDict(from_attributes=True)
    