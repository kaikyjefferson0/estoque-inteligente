from typing import Annotated, Literal

from fastapi import Form
from pydantic import BaseModel, Field

from app.schemas.comum import EntradaBase, SemNul
from app.schemas.users import SENHA_MAXIMA, SenhaNova


class FormularioLogin:
    """Corpo do POST /auth/login: formulário OAuth2, com o e-mail no campo username. São os campos do
    OAuth2PasswordRequestForm que a tela e o botão Authorize do Swagger enviam; os demais (grant_type,
    scope) são ignorados. RN-62: o caractere NUL em qualquer dos dois é 422 antes de chegar ao banco.
    O tamanho continua conferido no service, que responde 401 genérico (RN-03)."""

    def __init__(
        self,
        username: Annotated[str, SemNul, Form()],
        password: Annotated[str, SemNul, Form(json_schema_extra={"format": "password"})],
    ):
        self.username = username
        self.password = password


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class ChangePasswordIn(EntradaBase):
    """RN-48: o próprio usuário troca a senha informando a atual."""

    senha_atual: str = Field(min_length=1, max_length=SENHA_MAXIMA)
    senha_nova: SenhaNova
