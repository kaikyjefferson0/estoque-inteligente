from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MovementCreate(BaseModel):
    product_id: int
    lot_id: int | None = None
    movement_type: str
    quantity: int = Field(ge=0)
    reason: str | None = None


class MovementResponse(BaseModel):
    id: int
    product_id: int
    lot_id: int | None
    user_id: int
    movement_type: str
    quantity: int
    reason: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
    