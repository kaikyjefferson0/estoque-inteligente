"""Recriação de um banco descartável pelas migrations, usada pelo pytest (_test) e pelo teste de ponta a ponta (_e2e)."""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.engine import Engine

import app.models  # noqa: F401  (registra as tabelas no Base.metadata)
from app.core.database import Base

PASTA_BACKEND = Path(__file__).resolve().parents[1]
# Só bancos descartáveis: o do pytest e o do teste de ponta a ponta
SUFIXOS_PERMITIDOS = ("_test", "_e2e")


def _conferir_descartavel(engine: Engine) -> None:
    """Segunda trava contra apagar o banco errado, além da de quem chama."""
    nome = engine.url.database or ""
    if not nome.endswith(SUFIXOS_PERMITIDOS):
        raise RuntimeError(f"Recusando apagar o banco '{nome}': o nome não termina em _test nem em _e2e.")


def apagar_tudo(engine) -> None:
    """Apaga tabelas, versão do Alembic e a função do trigger (RN-12), que o drop_all não alcança."""
    _conferir_descartavel(engine)
    Base.metadata.drop_all(engine)
    with engine.begin() as conexao:
        conexao.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conexao.execute(text("DROP FUNCTION IF EXISTS stock_movements_imutavel()"))


def recriar_banco(engine, app_db_role: str) -> None:
    """Banco do zero pelas migrations (as mesmas do deploy), com as permissões
    do usuário da aplicação (RN-50) quando `app_db_role` tiver valor.

    Também limpa o que foi gravado de verdade: o histórico não aceita DELETE (RN-12),
    então o jeito é recriar.
    """
    apagar_tudo(engine)
    config = Config()
    config.set_main_option("script_location", str(PASTA_BACKEND / "alembic"))
    # Lidos pelo alembic\env.py e pela migration de permissões
    config.attributes["url"] = engine.url.render_as_string(hide_password=False)
    config.attributes["app_db_role"] = app_db_role
    command.upgrade(config, "head")
