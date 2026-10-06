from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pwdlib import PasswordHash

from app.models.user import User
from app.schemas.user import UserCreate


password_hash = PasswordHash.recommended()


async def create_user(
    db: AsyncSession,
    data: UserCreate,
) -> User:

    result = await db.execute(
        select(User).where(User.email == data.email)
    )

    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise ValueError(
            "Já existe um usuário com este e-mail."
        )

    user = User(
        name=data.name,
        email=data.email,
        password_hash=password_hash.hash(data.password),
        role=data.role,
        active=True,
    )

    db.add(user)

    await db.commit()
    await db.refresh(user)

    return user


async def list_users(
    db: AsyncSession,
) -> list[User]:

    result = await db.execute(
        select(User).order_by(User.id)
    )

    return list(result.scalars().all())
    