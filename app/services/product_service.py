from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.schemas.product import ProductCreate


async def create_product(
    db: AsyncSession,
    data: ProductCreate,
) -> Product:
    result = await db.execute(
        select(Product).where(
            Product.barcode == data.barcode
        )
    )

    existing_product = result.scalar_one_or_none()

    if existing_product:
        raise ValueError(
            "Já existe um produto com este código de barras."
        )

    product = Product(
        name=data.name,
        barcode=data.barcode,
        category_id=data.category_id,
        supplier_id=data.supplier_id,
        minimum_stock=data.minimum_stock,
        controls_expiration=data.controls_expiration,
    )

    db.add(product)

    await db.commit()
    await db.refresh(product)

    return product


async def list_products(
    db: AsyncSession,
) -> list[Product]:
    result = await db.execute(
        select(Product).order_by(Product.id)
    )

    return list(result.scalars().all())
    