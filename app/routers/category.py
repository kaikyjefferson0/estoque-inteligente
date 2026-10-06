from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.category import CategoryCreate, CategoryResponse
from app.services.category_service import create_category, list_categories


router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)


@router.post(
    "/",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category_endpoint(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_category(db, data)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


@router.get(
    "/",
    response_model=list[CategoryResponse],
)
async def list_categories_endpoint(
    db: AsyncSession = Depends(get_db),
):
    return await list_categories(db)
    