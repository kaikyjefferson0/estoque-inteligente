"""Sincroniza as permissões do usuário da aplicação (RN-50 e RN-58). Roda a cada deploy, depois do
alembic upgrade head, e pode ser repetido à vontade.

Uso, dentro de backend: py -m app.scripts.sincronizar_permissoes
Precisa de MIGRATIONS_DATABASE_URL (usuário dono) e APP_DB_ROLE, no ambiente ou no backend\\.env.
"""

import sys

from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError, DBAPIError
from sqlalchemy.pool import NullPool

from app.core import permissoes
from app.core.config import settings
from app.core.database import criar_engine


def main() -> int:
    if not settings.APP_DB_ROLE:
        print("Sincronização recusada: defina APP_DB_ROLE com o usuário da aplicação.", file=sys.stderr)
        return 1
    if not settings.MIGRATIONS_DATABASE_URL_DEFINIDA:
        print("Sincronização recusada: defina MIGRATIONS_DATABASE_URL com a URL do usuário dono.", file=sys.stderr)
        return 1
    try:
        dono = make_url(settings.MIGRATIONS_DATABASE_URL).username
    except ArgumentError:
        print("MIGRATIONS_DATABASE_URL não é uma URL de banco válida.", file=sys.stderr)
        return 1

    engine = criar_engine(settings.MIGRATIONS_DATABASE_URL, poolclass=NullPool, hide_parameters=True)
    try:
        with engine.begin() as conexao:
            resumo = permissoes.sincronizar(conexao, settings.APP_DB_ROLE, dono)
    except permissoes.PermissoesError as erro:
        print(erro, file=sys.stderr)
        return 1
    except DBAPIError as erro:
        # Só o erro do banco, sem o traceback nem a URL
        print(f"O banco recusou a sincronização: {type(erro.orig).__name__}: {erro.orig}", file=sys.stderr)
        return 1
    finally:
        engine.dispose()

    print(resumo, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
