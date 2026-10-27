import os
from pathlib import Path

from dotenv import load_dotenv

# backend\.env
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

SECRET_KEY_MINIMA = 32
# Valor de exemplo do .env.example: nunca pode ser usado como chave real
SECRET_KEY_EXEMPLO = "troque-por-uma-chave-gerada"
# Origem do Vite em desenvolvimento, usada quando CORS_ORIGINS não está definida
CORS_ORIGINS_PADRAO = "http://localhost:5173"


def validar_secret_key(valor: str) -> None:
    """Recusa chave curta ou igual ao exemplo, sem mostrar o valor na mensagem."""
    if valor.strip() == SECRET_KEY_EXEMPLO:
        raise RuntimeError(
            "SECRET_KEY ainda é o valor de exemplo do .env.example. "
            'Gere uma com: py -c "import secrets; print(secrets.token_hex(32))"'
        )
    if len(valor.strip()) < SECRET_KEY_MINIMA:
        raise RuntimeError(f"SECRET_KEY precisa ter pelo menos {SECRET_KEY_MINIMA} caracteres.")


def ler_cors_origins(valor: str | None) -> list[str]:
    """Lista separada por vírgula; vazia ou ausente cai no padrão do Vite."""
    origens = [o.strip().rstrip("/") for o in (valor or "").split(",") if o.strip()]
    return origens or [CORS_ORIGINS_PADRAO]


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    # Opcional: só os testes usam (o conftest exige que o banco termine em _test)
    TEST_DATABASE_URL: str = os.getenv("TEST_DATABASE_URL", "")
    # Opcional: origens do frontend autorizadas a chamar a API
    CORS_ORIGINS: list[str] = ler_cors_origins(os.getenv("CORS_ORIGINS"))

    def __init__(self) -> None:
        faltando = [nome for nome in ("DATABASE_URL", "SECRET_KEY") if not getattr(self, nome).strip()]
        if faltando:
            raise RuntimeError(
                f"Variável(is) obrigatória(s) vazia(s) ou ausente(s): {', '.join(faltando)}. "
                "Preencha no backend\\.env (veja o .env.example)."
            )
        validar_secret_key(self.SECRET_KEY)


settings = Settings()
