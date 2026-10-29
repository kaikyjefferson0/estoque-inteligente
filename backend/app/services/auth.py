from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.users import SENHA_MAXIMA
from app.services.users import buscar_por_email, gravar_senha

# Hash de uma senha qualquer, usado quando o e-mail não existe: assim o login
# sempre roda uma verificação Argon2 e o tempo de resposta não revela se o e-mail existe.
_HASH_FALSO = hash_password("senha-falsa-para-equalizar-tempo")

# Limite de e-mail do login: o tamanho da coluna users.email (a senha usa o mesmo máximo do cadastro).
EMAIL_MAXIMO = 255


def autenticar(db: Session, email: str, senha: str) -> User | None:
    """Devolve o usuário se e-mail e senha conferem e ele está ativo; senão None (RN-03, RN-21)."""
    # Entrada grande demais é recusada antes do Argon2, para não gastar CPU calculando hash dela
    if len(email) > EMAIL_MAXIMO or len(senha) > SENHA_MAXIMA:
        return None
    usuario = buscar_por_email(db, email)
    if usuario is None:
        verify_password(senha, _HASH_FALSO)
        return None
    if not verify_password(senha, usuario.senha_hash):
        return None
    if not usuario.ativo:
        return None
    return usuario


class SenhaAtualIncorretaError(Exception):
    pass


class SenhaNovaIgualError(Exception):
    pass


class ContaDemonstracaoError(Exception):
    """RN-53: a conta de demonstração não troca a própria senha."""


def trocar_senha(db: Session, usuario: User, senha_atual: str, senha_nova: str) -> None:
    """RN-48: confere a senha atual, exige uma nova diferente e invalida os tokens anteriores."""
    # RN-53: antes de conferir a senha, para a recusa não revelar se a senha atual estava certa
    if usuario.demo:
        raise ContaDemonstracaoError()
    if not verify_password(senha_atual, usuario.senha_hash):
        raise SenhaAtualIncorretaError()
    if verify_password(senha_nova, usuario.senha_hash):
        raise SenhaNovaIgualError()
    gravar_senha(usuario, senha_nova)
    db.commit()
