import os
from pathlib import Path

from dotenv import load_dotenv

# backend\.env
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    # Opcional: só os testes usam (o conftest exige que o banco termine em _test)
    TEST_DATABASE_URL: str = os.getenv("TEST_DATABASE_URL", "")

    def __init__(self) -> None:
        faltando = [nome for nome in ("DATABASE_URL", "SECRET_KEY") if not getattr(self, nome).strip()]
        if faltando:
            raise RuntimeError(
                f"Variável(is) obrigatória(s) vazia(s) ou ausente(s): {', '.join(faltando)}. "
                "Preencha no backend\\.env (veja o .env.example)."
            )


settings = Settings()
