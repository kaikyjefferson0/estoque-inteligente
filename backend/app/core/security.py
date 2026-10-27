from datetime import datetime, timedelta, timezone
from typing import NamedTuple

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import settings

ALGORITHM = "HS256"

_hasher = PasswordHasher()


class TokenDecodificado(NamedTuple):
    usuario_id: int
    # Momento da emissão (iat) em segundos desde a época, com fração (RN-48 e RN-49)
    emitido_em: float


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def create_access_token(user_id: int) -> str:
    agora = datetime.now(timezone.utc)
    expire = agora + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    # iat com fração de segundo: um token emitido logo depois de uma troca de senha,
    # no mesmo segundo, não pode parecer anterior a ela
    payload = {"sub": str(user_id), "iat": agora.timestamp(), "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> TokenDecodificado | None:
    """Devolve o id do usuário e a emissão, ou None se o token for inválido, expirado ou sem iat."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"require": ["sub", "iat", "exp"]},
        )
        return TokenDecodificado(int(payload["sub"]), float(payload["iat"]))
    except (jwt.InvalidTokenError, KeyError, ValueError, TypeError):
        return None
