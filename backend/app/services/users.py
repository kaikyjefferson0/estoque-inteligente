from datetime import datetime, timezone

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
        raise ValueError(f"Perfil inválido: {perfil}. Use admin ou operador.")

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


def gravar_senha(usuario: User, senha: str) -> None:
    """Grava o hash da nova senha e marca a troca: tokens emitidos antes deixam de valer (RN-48, RN-49)."""
    usuario.senha_hash = hash_password(senha)
    usuario.senha_alterada_em = datetime.now(timezone.utc)


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
        raise ValueError(f"Perfil inválido: {dados['perfil']}. Use admin ou operador.")

    # RN-22
    if usuario.id == admin.id:
        if dados.get("ativo") is False:
            raise AutoAlteracaoProibidaError("Você não pode desativar o próprio usuário. Peça a outro administrador, se precisar.")
        if "perfil" in dados and dados["perfil"] != usuario.perfil:
            raise AutoAlteracaoProibidaError("Você não pode mudar o próprio perfil. Peça a outro administrador, se precisar.")

    if "nome" in dados:
        usuario.nome = dados["nome"].strip()
    if "perfil" in dados:
        usuario.perfil = dados["perfil"]
    if "ativo" in dados:
        usuario.ativo = dados["ativo"]

    db.commit()
    db.refresh(usuario)
    return usuario


def definir_senha(db: Session, admin: User, usuario_id: int, senha_nova: str) -> None:
    """RN-49: o admin define a senha de outro usuário; a própria só pela troca com a senha atual (RN-48)."""
    usuario = obter_usuario(db, usuario_id)
    if usuario.id == admin.id:
        raise AutoAlteracaoProibidaError("Para trocar a sua senha, use Minha conta e informe a senha atual.")
    gravar_senha(usuario, senha_nova)
    db.commit()
