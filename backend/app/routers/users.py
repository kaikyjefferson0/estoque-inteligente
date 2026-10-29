from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.schemas.paginacao import Pagina, Paginacao, paginacao
from app.schemas.users import UserCreate, UserOut, UserPasswordIn, UserUpdate
from app.services import users as service

# RN-02 e RN-20: toda a área de usuários é só do admin
router = APIRouter(prefix="/users", tags=["users"], dependencies=[Depends(require_admin)])


@router.get("", response_model=Pagina[UserOut])
def listar(db: Annotated[Session, Depends(get_db)], pagina: Annotated[Paginacao, Depends(paginacao)]):
    return service.listar_usuarios(db, pagina.limite, pagina.deslocamento)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def criar(dados: UserCreate, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.criar_usuario(db, nome=dados.nome, email=dados.email, senha=dados.senha, perfil=dados.perfil)
    except service.EmailJaCadastradoError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este e-mail já está cadastrado. Use outro e-mail.")


@router.get("/{usuario_id}", response_model=UserOut)
def obter(usuario_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.obter_usuario(db, usuario_id)
    except service.UsuarioNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado. Atualize a lista de usuários.")


@router.patch("/{usuario_id}", response_model=UserOut)
def atualizar(
    usuario_id: int,
    dados: UserUpdate,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        return service.atualizar_usuario(db, admin, usuario_id, dados.model_dump(exclude_unset=True))
    except service.UsuarioNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado. Atualize a lista de usuários.")
    except (service.AutoAlteracaoProibidaError, service.PerfilDaContaDemoError) as erro:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))


@router.post("/{usuario_id}/password", status_code=status.HTTP_204_NO_CONTENT)
def definir_senha(
    usuario_id: int,
    dados: UserPasswordIn,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    try:
        service.definir_senha(db, admin, usuario_id, dados.senha_nova)
    except service.UsuarioNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado. Atualize a lista de usuários.")
    except service.AutoAlteracaoProibidaError as erro:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
