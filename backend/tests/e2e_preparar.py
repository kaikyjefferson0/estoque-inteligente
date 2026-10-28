"""Prepara o banco estoque_e2e: recria pelas migrations (com APP_DB_ROLE) e cria um admin e um operador.

Uso (o npm run test:e2e chama sozinho, dentro de backend):
    py -m tests.e2e_preparar

As senhas chegam por variável de ambiente (E2E_SENHA_ADMIN e E2E_SENHA_OPERADOR),
geradas na hora pelo frontend\\e2e\\rodar.mjs; nada é gravado em arquivo.
"""

import os
import sys

from tests import e2e_ambiente

EMAIL_ADMIN = "admin.e2e@exemplo.com.br"
EMAIL_OPERADOR = "operador.e2e@exemplo.com.br"


def _senha(variavel: str) -> str:
    senha = os.getenv(variavel, "")
    if len(senha) < 8:
        raise e2e_ambiente.AmbienteInvalido(f"{variavel} ausente ou curta: rode pelo npm run test:e2e.")
    return senha


def main() -> int:
    try:
        url_dono, url_app = e2e_ambiente.configurar()
        senha_admin = _senha("E2E_SENHA_ADMIN")
        senha_operador = _senha("E2E_SENHA_OPERADOR")
    except e2e_ambiente.AmbienteInvalido as erro:
        print(f"[e2e] {erro}", file=sys.stderr)
        return 1

    # Só depois de configurar: a API lê DATABASE_URL e APP_DB_ROLE na importação
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core.config import settings
    from app.services.users import criar_usuario
    from tests import banco

    dono = create_engine(url_dono)
    try:
        banco.recriar_banco(dono, settings.APP_DB_ROLE)
    finally:
        dono.dispose()

    # Os usuários entram pelo usuário da aplicação, como na API (RN-50)
    aplicacao = create_engine(url_app)
    try:
        with Session(aplicacao) as db:
            criar_usuario(db, nome="Admin E2E", email=EMAIL_ADMIN, senha=senha_admin, perfil="admin")
            criar_usuario(db, nome="Operador E2E", email=EMAIL_OPERADOR, senha=senha_operador, perfil="operador")
    finally:
        aplicacao.dispose()
    print("[e2e] Banco recriado pelas migrations; admin e operador criados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
