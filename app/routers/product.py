from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.product import ProductCreate, ProductResponse
from app.services.product_service import (
    create_product,
    list_products,
)


router = APIRouter(
    prefix="/products",
    tags=["Products"],
)


@router.post(
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product_endpoint(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await create_product(db, data)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


@router.get(
    "/",
    response_model=list[ProductResponse],
)
async def list_products_endpoint(
    db: AsyncSession = Depends(get_db),
):
    return await list_products(db)
    