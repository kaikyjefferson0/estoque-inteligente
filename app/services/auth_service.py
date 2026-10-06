from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest


async def authenticate_user(
    db: AsyncSession,
    data: LoginRequest,
) -> User:

    result = await db.execute(
        select(User).where(User.email == data.email)
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise ValueError("E-mail ou senha inválidos.")

    if not user.active:
        raise ValueError("E-mail ou senha inválidos.")

    if not verify_password(
        data.password,
        user.password_hash,
    ):
        raise ValueError("E-mail ou senha inválidos.")

    return user


def generate_token_for_user(
    user: User,
) -> str:

    return create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
        }
    )
    