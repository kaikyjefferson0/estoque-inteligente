from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User

PERFIS = ("admin", "operador")  # RN-01


class EmailJaCadastradoError(Exception):
    pass


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
