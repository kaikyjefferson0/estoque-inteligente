from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.schemas.category import CategoryCreate


async def create_category(
    db: AsyncSession,
    data: CategoryCreate,
) -> Category:
    result = await db.execute(
        select(Category).where(Category.name == data.name)
    )

    existing_category = result.scalar_one_or_none()

    if existing_category:
        raise ValueError("Já existe uma categoria com este nome.")

    category = Category(
        name=data.name,
    )

    db.add(category)
    await db.commit()
    await db.refresh(category)

    return category


async def list_categories(
    db: AsyncSession,
) -> list[Category]:
    result = await db.execute(
        select(Category).order_by(Category.id)
    )

    return list(result.scalars().all())
    