from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.user_service import create_user, list_users


router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user_endpoint(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_user(db, data)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


@router.get(
    "/",
    response_model=list[UserResponse],
)
async def list_users_endpoint(
    db: AsyncSession = Depends(get_db),
):
    return await list_users(db)
    