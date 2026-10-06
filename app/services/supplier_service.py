from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate


async def create_supplier(
    db: AsyncSession,
    data: SupplierCreate,
) -> Supplier:
    supplier = Supplier(
        name=data.name,
        cnpj=data.cnpj,
    )

    db.add(supplier)

    await db.commit()
    await db.refresh(supplier)

    return supplier


async def list_suppliers(
    db: AsyncSession,
) -> list[Supplier]:
    result = await db.execute(
        select(Supplier).order_by(Supplier.id)
    )

    return list(result.scalars().all())
    