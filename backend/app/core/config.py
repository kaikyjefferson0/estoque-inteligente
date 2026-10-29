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


def normalizar_url_banco(valor: str) -> str:
    """O Render entrega a URL como postgresql:// (ou postgres://), que no SQLAlchemy cai no
    driver psycopg2; o projeto usa o psycopg 3 (postgresql+psycopg://)."""
    url = valor.strip()
    for prefixo in ("postgresql://", "postgres://"):
        if url.startswith(prefixo):
            return "postgresql+psycopg://" + url.removeprefix(prefixo)
    return url


def com_https(endereco: str) -> str:
    """Endereço sem esquema (ex.: estoque-site.onrender.com) ganha https://, o único que o Render serve."""
    return endereco if "://" in endereco else f"https://{endereco}"


def ler_cors_origins(valor: str | None) -> list[str]:
    """Lista separada por vírgula; vazia ou ausente cai no padrão do Vite."""
    origens = [com_https(o.strip().rstrip("/")) for o in (valor or "").split(",") if o.strip()]
    return origens or [CORS_ORIGINS_PADRAO]


def ler_booleano(valor: str | None) -> bool:
    """Liga só com true, 1, sim, yes ou on (sem diferenciar maiúsculas); o resto desliga."""
    return (valor or "").strip().lower() in ("true", "1", "sim", "yes", "on")


AMBIENTES = ("development", "production")


def ler_ambiente(valor: str | None) -> str:
    """development (padrão) ou production. Valor desconhecido derruba a API ao subir, para um
    erro de digitação ("prod") não deixar a produção com /docs aberto e sem HSTS."""
    ambiente = (valor or "").strip().lower() or "development"
    if ambiente not in AMBIENTES:
        raise RuntimeError("APP_ENV precisa ser development ou production.")
    return ambiente


def validar_ambiente(app_env: str, no_render: bool, confia_no_proxy: bool) -> None:
    """Travas de produção, conferidas ao subir a API."""
    # O Render define RENDER sozinho: esquecer o APP_ENV lá deixaria /docs aberto e sem HSTS
    if no_render and app_env != "production":
        raise RuntimeError("A API está rodando no Render, mas APP_ENV não é production. Defina APP_ENV=production.")
    # Atrás do proxy, sem ler o X-Forwarded-For todos os clientes teriam o IP do proxy e
    # dividiriam o mesmo limite de login (RN-47): 10 tentativas de qualquer um travariam todos
    if app_env == "production" and not confia_no_proxy:
        raise RuntimeError("Em production, defina TRUST_PROXY_HEADERS=true (a API fica atrás do proxy do Render).")


class Settings:
    DATABASE_URL: str = normalizar_url_banco(os.getenv("DATABASE_URL", ""))
    # RN-50: as migrations usam o usuário dono; sem a variável, caem na DATABASE_URL
    # (instalação com um usuário só)
    MIGRATIONS_DATABASE_URL: str = normalizar_url_banco(os.getenv("MIGRATIONS_DATABASE_URL", "")) or DATABASE_URL
    # RN-54: a recriação do demo exige a URL do dono escrita de propósito, sem cair na DATABASE_URL
    MIGRATIONS_DATABASE_URL_DEFINIDA: bool = bool(os.getenv("MIGRATIONS_DATABASE_URL", "").strip())
    # RN-50: opcional; com valor, a migration de permissões concede a esse usuário só o necessário
    APP_DB_ROLE: str = os.getenv("APP_DB_ROLE", "").strip()
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    # Opcional: só os testes usam (o conftest exige que o banco termine em _test)
    TEST_DATABASE_URL: str = normalizar_url_banco(os.getenv("TEST_DATABASE_URL", ""))
    # Opcional: o mesmo banco _test, mas com o usuário da aplicação (testes CT-60 e CT-61)
    TEST_APP_DATABASE_URL: str = normalizar_url_banco(os.getenv("TEST_APP_DATABASE_URL", ""))
    # Opcional: origens do frontend autorizadas a chamar a API
    CORS_ORIGINS: list[str] = ler_cors_origins(os.getenv("CORS_ORIGINS"))
    # RN-47: só ligar quando a API estiver atrás de um proxy confiável (Render);
    # desligada, o X-Forwarded-For é ignorado e vale o IP da conexão
    TRUST_PROXY_HEADERS: bool = ler_booleano(os.getenv("TRUST_PROXY_HEADERS"))
    # production desliga /docs, /redoc e /openapi.json e liga o HSTS
    APP_ENV: str = ler_ambiente(os.getenv("APP_ENV"))
    # RN-54 e RN-55: modo de demonstração. Ligado, a API recria os dados de exemplo ao iniciar
    # (se a última recriação passou de 24 horas) com estas contas. Desligado, nada disso é lido.
    DEMO_MODE: bool = ler_booleano(os.getenv("DEMO_MODE"))
    DEMO_EMAIL: str = os.getenv("DEMO_EMAIL", "").strip() or "demo@exemplo.com.br"
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "").strip()
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")
    # Definida pelo próprio Render em todos os serviços dele
    NO_RENDER: bool = bool(os.getenv("RENDER", "").strip())

    @property
    def em_producao(self) -> bool:
        return self.APP_ENV == "production"

    def __init__(self) -> None:
        faltando = [nome for nome in ("DATABASE_URL", "SECRET_KEY") if not getattr(self, nome).strip()]
        if faltando:
            raise RuntimeError(
                f"Variável(is) obrigatória(s) vazia(s) ou ausente(s): {', '.join(faltando)}. "
                "Preencha no backend\\.env (veja o .env.example)."
            )
        validar_secret_key(self.SECRET_KEY)
        validar_ambiente(self.APP_ENV, self.NO_RENDER, self.TRUST_PROXY_HEADERS)


settings = Settings()
