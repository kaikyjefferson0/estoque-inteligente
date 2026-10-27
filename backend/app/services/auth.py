from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.services.users import buscar_por_email

# Hash de uma senha qualquer, usado quando o e-mail não existe: assim o login
# sempre roda uma verificação Argon2 e o tempo de resposta não revela se o e-mail existe.
_HASH_FALSO = hash_password("senha-falsa-para-equalizar-tempo")


def autenticar(db: Session, email: str, senha: str) -> User | None:
    """Devolve o usuário se e-mail e senha conferem e ele está ativo; senão None (RN-03, RN-21)."""
    usuario = buscar_por_email(db, email)
    if usuario is None:
        verify_password(senha, _HASH_FALSO)
        return None
    if not verify_password(senha, usuario.senha_hash):
        return None
    if not usuario.ativo:
        return None
    return usuario
