"""Ambiente do teste de ponta a ponta (npm run test:e2e): banco estoque_e2e, API na 8001 e site na 5175.

Precisa ser importado antes de qualquer módulo `app`, porque a configuração da API
é lida na importação (app.core.config).
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

PASTA_BACKEND = Path(__file__).resolve().parents[1]
PORTA_API = 8001
ORIGEM_SITE = "http://localhost:5175"
SUFIXO = "_e2e"


class AmbienteInvalido(RuntimeError):
    pass


def _banco(variavel: str) -> str:
    """Lê a URL do .env e confere o nome do banco, sem nunca mostrar a URL (tem senha)."""
    url = os.getenv(variavel, "").strip()
    if not url:
        raise AmbienteInvalido(f"{variavel} não definida no backend\\.env.")
    nome = make_url(url).database or ""
    if not nome.endswith(SUFIXO):
        raise AmbienteInvalido(f"Recusando rodar: o banco de {variavel} ('{nome}') não termina em {SUFIXO}.")
    return url


def configurar() -> tuple[str, str]:
    """Devolve (URL do dono, URL do usuário da aplicação) e aponta a API para o banco _e2e."""
    load_dotenv(PASTA_BACKEND / ".env")
    url_dono = _banco("E2E_DATABASE_URL")
    url_app = _banco("E2E_APP_DATABASE_URL")
    if make_url(url_dono).database != make_url(url_app).database:
        raise AmbienteInvalido("E2E_DATABASE_URL e E2E_APP_DATABASE_URL precisam apontar para o mesmo banco.")
    papel = os.getenv("APP_DB_ROLE", "").strip()
    if not papel:
        raise AmbienteInvalido("APP_DB_ROLE não definida: o teste de ponta a ponta usa o usuário da aplicação (RN-50).")
    # RN-50: a API precisa rodar como o usuário da aplicação, nunca como o dono
    if make_url(url_app).username != papel:
        raise AmbienteInvalido("E2E_APP_DATABASE_URL precisa usar o usuário da APP_DB_ROLE (RN-50).")
    if make_url(url_dono).username == papel:
        raise AmbienteInvalido("E2E_DATABASE_URL precisa usar o dono do banco, não o usuário da aplicação.")
    # Variáveis já definidas valem mais que o .env (load_dotenv não sobrescreve)
    os.environ["DATABASE_URL"] = url_app
    os.environ["MIGRATIONS_DATABASE_URL"] = url_dono
    os.environ["CORS_ORIGINS"] = ORIGEM_SITE
    os.environ["TRUST_PROXY_HEADERS"] = "false"
    return url_dono, url_app
