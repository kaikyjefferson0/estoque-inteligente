from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """RN-18 e RN-21: exige token válido de um usuário existente e ativo."""
    nao_autenticado = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    usuario_id = decode_access_token(token)
    if usuario_id is None:
        raise nao_autenticado
    usuario = db.get(User, usuario_id)
    if usuario is None or not usuario.ativo:
        raise nao_autenticado
    return usuario


def require_admin(usuario: Annotated[User, Depends(get_current_user)]) -> User:
    """RN-02: só o admin passa."""
    if usuario.perfil != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao admin")
    return usuario
