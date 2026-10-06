from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.supplier import SupplierCreate, SupplierResponse
from app.services.supplier_service import (
    create_supplier,
    list_suppliers,
)


router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"],
)


@router.post(
    "/",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_supplier_endpoint(
    data: SupplierCreate,
    db: AsyncSession = Depends(get_db),
):
    return await create_supplier(db, data)


@router.get(
    "/",
    response_model=list[SupplierResponse],
)
async def list_suppliers_endpoint(
    db: AsyncSession = Depends(get_db),
):
    return await list_suppliers(db)
    