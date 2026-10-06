from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lot import Lot
from app.models.product import Product
from app.schemas.lot import LotCreate


async def create_lot(
    db: AsyncSession,
    data: LotCreate,
) -> Lot:

    result = await db.execute(
        select(Product).where(Product.id == data.product_id)
    )

    product = result.scalar_one_or_none()

    if product is None:
        raise ValueError("Produto não encontrado.")

    if product.controls_expiration and data.expiration_date is None:
        raise ValueError(
            "Este produto controla validade. Informe a data de validade."
        )

    lot = Lot(
        product_id=data.product_id,
        lot_code=data.lot_code,
        quantity=data.quantity,
        expiration_date=data.expiration_date,
    )

    db.add(lot)

    await db.commit()
    await db.refresh(lot)

    return lot


async def list_lots(
    db: AsyncSession,
) -> list[Lot]:

    result = await db.execute(
        select(Lot).order_by(Lot.id)
    )

    return list(result.scalars().all())
    