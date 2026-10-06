from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.models.user import User

from app.core.database import get_db
from app.schemas.movement import MovementCreate, MovementResponse
from app.services.movement_service import create_movement, list_movements


router = APIRouter(
    prefix="/movements",
    tags=["Movements"],
)


@router.post(
    "/",
    response_model=MovementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_movement_endpoint(
    data: MovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):


    try:
        return await create_movement(
            db=db,
            data=data,
            user_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )
        
@router.get(
    "/",
    response_model=list[MovementResponse],
)
async def list_movements_endpoint(
    db: AsyncSession = Depends(get_db),
):
    return await list_movements(db)
    

    