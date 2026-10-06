from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertResponse
from app.services.alert_service import generate_alerts

router = APIRouter(
    prefix="/alerts",
    tags=["Alerts"],
)


@router.post(
    "/generate",
    response_model=list[AlertResponse],
)
async def generate_alerts_endpoint(
    db: AsyncSession = Depends(get_db),
):
    return await generate_alerts(db)


@router.get(
    "/",
    response_model=list[AlertResponse],
)
async def list_alerts_endpoint(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).order_by(Alert.id)
    )

    return list(result.scalars().all())
    
    