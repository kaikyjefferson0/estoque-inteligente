from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import TokenOut
from app.schemas.users import UserOut
from app.services.auth import autenticar

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    # O campo username do formulário OAuth2 recebe o e-mail
    usuario = autenticar(db, form.username, form.password)
    if usuario is None:
        # RN-03: mesma mensagem para e-mail inexistente, senha errada ou usuário inativo
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenOut(access_token=create_access_token(usuario.id))


@router.get("/me", response_model=UserOut)
def me(usuario: Annotated[User, Depends(get_current_user)]):
    return usuario
