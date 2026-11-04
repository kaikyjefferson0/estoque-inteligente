"""Recriação de um banco do zero pelas migrations (as mesmas do deploy).

Usada pelos bancos descartáveis dos testes (tests\banco.py, que confere o nome) e pela
recriação dos dados de demonstração (RN-54, que confere o DEMO_MODE). Precisa do usuário dono.
"""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import Engine

import app.models  # noqa: F401  (registra as tabelas no Base.metadata)
from app.core import permissoes
from app.core.database import Base

PASTA_BACKEND = Path(__file__).resolve().parents[2]


def apagar_estrutura(engine: Engine) -> None:
    """Apaga tabelas, versão do Alembic e a função do trigger (RN-12), que o drop_all não alcança."""
    Base.metadata.drop_all(engine)
    with engine.begin() as conexao:
        conexao.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conexao.execute(text("DROP FUNCTION IF EXISTS stock_movements_imutavel()"))


def aplicar_migrations(engine: Engine, app_db_role: str) -> None:
    """Sobe até a última migration e, quando `app_db_role` tiver valor, sincroniza as permissões
    do usuário da aplicação (RN-50 e RN-58)."""
    subir_migrations(engine, app_db_role)
    if app_db_role:
        with engine.begin() as conexao:
            permissoes.sincronizar(conexao, app_db_role, engine.url.username)


def subir_migrations(engine: Engine, app_db_role: str) -> None:
    """Só o Alembic, como o `alembic upgrade head` do deploy: uma revisão já aplicada não roda de novo."""
    config = Config()
    config.set_main_option("script_location", str(PASTA_BACKEND / "alembic"))
    # Lidos pelo alembic\env.py e pelas migrations de permissões
    config.attributes["url"] = engine.url.render_as_string(hide_password=False)
    config.attributes["app_db_role"] = app_db_role
    command.upgrade(config, "head")
