from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.limiter import LIMITE_LOGIN, LIMITE_TROCA_SENHA, limiter, usuario_do_token
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import ChangePasswordIn, TokenOut
from app.schemas.users import UserOut
from app.services import auth as service

router = APIRouter(prefix="/auth", tags=["auth"])


def erro_de_campo(campo: str, mensagem: str) -> HTTPException:
    """422 no mesmo formato da validação do Pydantic, para o frontend marcar o campo."""
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=[{"loc": ["body", campo], "msg": mensagem, "type": "value_error"}],
    )


@router.post("/login", response_model=TokenOut)
@limiter.limit(LIMITE_LOGIN)  # RN-47
def login(
    request: Request,  # usado pelo limiter para achar o IP
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    # O campo username do formulário OAuth2 recebe o e-mail
    usuario = service.autenticar(db, form.username, form.password)
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


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(LIMITE_TROCA_SENHA, key_func=usuario_do_token)  # RN-52
def trocar_senha(
    request: Request,  # usado pelo limiter para ler o token
    dados: ChangePasswordIn,
    usuario: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        service.trocar_senha(db, usuario, dados.senha_atual, dados.senha_nova)
    except service.SenhaAtualIncorretaError:
        raise erro_de_campo("senha_atual", "A senha atual não confere. Digite a senha que você usa para entrar.")
    except service.SenhaNovaIgualError:
        raise erro_de_campo("senha_nova", "A nova senha precisa ser diferente da atual.")
