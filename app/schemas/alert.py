from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    id: int
    product_id: int
    lot_id: int | None
    alert_type: str
    active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
    
    