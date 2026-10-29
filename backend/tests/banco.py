"""Recriação de um banco descartável pelas migrations, usada pelo pytest (_test) e pelo teste de ponta a ponta (_e2e)."""

from sqlalchemy.engine import Engine

from app.core import migracoes

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
    migracoes.apagar_estrutura(engine)


def recriar_banco(engine, app_db_role: str) -> None:
    """Banco do zero pelas migrations (as mesmas do deploy), com as permissões
    do usuário da aplicação (RN-50) quando `app_db_role` tiver valor.

    Também limpa o que foi gravado de verdade: o histórico não aceita DELETE (RN-12),
    então o jeito é recriar.
    """
    apagar_tudo(engine)
    migracoes.aplicar_migrations(engine, app_db_role)
