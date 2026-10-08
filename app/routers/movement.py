from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.movement import (
    MovementCreate,
    MovementResponse,
)
from app.services.movement_service import (
    create_movement,
    list_movements,
)

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
        movement = await create_movement(
            db=db,
            data=data,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )

    return MovementResponse(
        id=movement.id,
        product_id=movement.product_id,
        lot_id=movement.lot_id,
        user_id=movement.user_id,
        user_name=current_user.name,
        movement_type=movement.movement_type,
        quantity=movement.quantity,
        reason=movement.reason,
        created_at=movement.created_at,
    )


@router.get(
    "/",
    response_model=list[MovementResponse],
)
async def list_movements_endpoint(
    db: AsyncSession = Depends(get_db),
):
    movements = await list_movements(db)

    responses = []

    for movement in movements:
        user = await db.get(
            User,
            movement.user_id,
        )

        responses.append(
            MovementResponse(
                id=movement.id,
                product_id=movement.product_id,
                lot_id=movement.lot_id,
                user_id=movement.user_id,
                user_name=(
                    user.name
                    if user
                    else f"Usuário #{movement.user_id}"
                ),
                movement_type=movement.movement_type,
                quantity=movement.quantity,
                reason=movement.reason,
                created_at=movement.created_at,
            )
        )

    return responses
    
    

    