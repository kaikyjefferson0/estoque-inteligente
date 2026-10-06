from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class LotCreate(BaseModel):
    product_id: int
    lot_code: str
    quantity: int = Field(gt=0)
    expiration_date: date | None = None


class LotResponse(BaseModel):
    id: int
    product_id: int
    lot_code: str
    quantity: int
    expiration_date: date | None

    model_config = ConfigDict(from_attributes=True)
    