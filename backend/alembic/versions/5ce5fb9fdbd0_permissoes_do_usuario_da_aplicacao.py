"""permissoes do usuario da aplicacao

Revision ID: 5ce5fb9fdbd0
Revises: fd9b557d540c
Create Date: 2026-10-28 15:36:07.730389

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.core.config import settings


# revision identifiers, used by Alembic.
revision: str = '5ce5fb9fdbd0'
down_revision: Union[str, Sequence[str], None] = 'fd9b557d540c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _papel_da_aplicacao() -> str | None:
    """RN-50: usuário da aplicação já entre aspas, ou None quando não há (instalação com um usuário só).

    O conftest passa o nome em config.attributes; fora dos testes vem da APP_DB_ROLE.
    """
    atributos = op.get_context().config.attributes
    nome = (atributos["app_db_role"] if "app_db_role" in atributos else settings.APP_DB_ROLE) or ""
    nome = nome.strip()
    if not nome:
        return None

    bind = op.get_bind()
    if bind.scalar(sa.text("SELECT 1 FROM pg_roles WHERE rolname = :nome"), {"nome": nome}) is None:
        raise RuntimeError(f"APP_DB_ROLE: o usuário de banco '{nome}' não existe. Crie-o antes da migration.")
    if nome == bind.scalar(sa.text("SELECT current_user")):
        raise RuntimeError(
            "APP_DB_ROLE é o mesmo usuário que roda as migrations (o dono). "
            "Use um usuário separado para a API ou deixe APP_DB_ROLE vazia."
        )
    return bind.dialect.identifier_preparer.quote(nome)


def upgrade() -> None:
    """Upgrade schema."""
    papel = _papel_da_aplicacao()
    if papel is None:
        return

    # RN-50: a API lê e grava dados, mas não cria nem altera tabelas (não é dona de nenhuma
    # e não recebe CREATE no schema; no Postgres 15+ o PUBLIC também não tem CREATE)
    op.execute(f"GRANT USAGE ON SCHEMA public TO {papel}")
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {papel}")
    op.execute(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {papel}")

    # RN-12/RN-50: no histórico, só leitura e inserção; o trigger continua valendo para o dono
    op.execute(f"REVOKE UPDATE, DELETE, TRUNCATE ON stock_movements FROM {papel}")
    # A API não precisa saber a versão das migrations
    op.execute(f"REVOKE ALL ON alembic_version FROM {papel}")

    # Tabelas e sequências criadas depois pelo dono (quem roda as migrations) já nascem
    # liberadas. Uma tabela nova que também só aceite inserção precisa do seu próprio REVOKE.
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {papel}"
    )
    op.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {papel}")


def downgrade() -> None:
    """Downgrade schema."""
    papel = _papel_da_aplicacao()
    if papel is None:
        return

    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM {papel}"
    )
    op.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM {papel}")
    op.execute(f"REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM {papel}")
    op.execute(f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {papel}")
    op.execute(f"REVOKE USAGE ON SCHEMA public FROM {papel}")
