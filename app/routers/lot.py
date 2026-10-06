from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.lot import LotCreate, LotResponse
from app.services.lot_service import create_lot, list_lots


router = APIRouter(
    prefix="/lots",
    tags=["Lots"],
)


@router.post(
    "/",
    response_model=LotResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_lot_endpoint(
    data: LotCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_lot(db, data)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


@router.get(
    "/",
    response_model=list[LotResponse],
)
async def list_lots_endpoint(
    db: AsyncSession = Depends(get_db),
):
    return await list_lots(db)
    