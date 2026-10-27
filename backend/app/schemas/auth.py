from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.users import SENHA_MAXIMA, SenhaNova


class TokenOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class ChangePasswordIn(BaseModel):
    """RN-48: o próprio usuário troca a senha informando a atual."""

    model_config = ConfigDict(extra="forbid")

    senha_atual: str = Field(min_length=1, max_length=SENHA_MAXIMA)
    senha_nova: SenhaNova
