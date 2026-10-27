from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User

PERFIS = ("admin", "operador")  # RN-01


class EmailJaCadastradoError(Exception):
    pass


class UsuarioNaoEncontradoError(Exception):
    pass


class AutoAlteracaoProibidaError(Exception):
    """RN-22: o admin não pode desativar a si mesmo nem mudar o próprio perfil."""


def normalizar_email(email: str) -> str:
    return email.strip().lower()


def buscar_por_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == normalizar_email(email)))


def criar_usuario(db: Session, nome: str, email: str, senha: str, perfil: str) -> User:
    if perfil not in PERFIS:
        raise ValueError(f"Perfil inválido: {perfil}")

    email = normalizar_email(email)
    if buscar_por_email(db, email) is not None:
        raise EmailJaCadastradoError(email)

    usuario = User(nome=nome.strip(), email=email, senha_hash=hash_password(senha), perfil=perfil)
    db.add(usuario)
    try:
        db.commit()
    except IntegrityError:
        # Outro cadastro com o mesmo e-mail entrou entre a busca e o commit
        db.rollback()
        raise EmailJaCadastradoError(email)
    db.refresh(usuario)
    return usuario


def listar_usuarios(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.id)))


def obter_usuario(db: Session, usuario_id: int) -> User:
    usuario = db.get(User, usuario_id)
    if usuario is None:
        raise UsuarioNaoEncontradoError(usuario_id)
    return usuario


def atualizar_usuario(db: Session, admin: User, usuario_id: int, dados: dict) -> User:
    """Altera nome, perfil e/ou ativo. `dados` só traz os campos enviados."""
    usuario = obter_usuario(db, usuario_id)

    if "perfil" in dados and dados["perfil"] not in PERFIS:
        raise ValueError(f"Perfil inválido: {dados['perfil']}")

    # RN-22
    if usuario.id == admin.id:
        if dados.get("ativo") is False:
            raise AutoAlteracaoProibidaError("O admin não pode desativar a si mesmo.")
        if "perfil" in dados and dados["perfil"] != usuario.perfil:
            raise AutoAlteracaoProibidaError("O admin não pode mudar o próprio perfil.")

    if "nome" in dados:
        usuario.nome = dados["nome"].strip()
    if "perfil" in dados:
        usuario.perfil = dados["perfil"]
    if "ativo" in dados:
        usuario.ativo = dados["ativo"]

    db.commit()
    db.refresh(usuario)
    return usuario
