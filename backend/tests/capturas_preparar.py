"""Prepara o banco estoque_e2e para as capturas do README: recria pelas migrations e cria
as contas de exemplo (admin@exemplo.com e demo@exemplo.com) com os dados de demonstração.

Uso (o npm run capturas:readme chama sozinho, dentro de frontend):
    py -m tests.capturas_preparar

As senhas chegam por variável de ambiente (CAPTURAS_SENHA_ADMIN e CAPTURAS_SENHA_DEMO),
geradas na hora pelo frontend\\scripts\\capturas-readme-rodar.mjs; nada é gravado em arquivo.
Usa o mesmo ambiente do teste de ponta a ponta (tests.e2e_ambiente): só o banco estoque_e2e,
nunca o estoque_dev, e a API roda como o usuário da aplicação (RN-50).
"""

import sys
from datetime import datetime, timezone

from tests import e2e_ambiente, e2e_preparar

EMAIL_ADMIN = "admin@exemplo.com"
EMAIL_DEMO = "demo@exemplo.com"


def main() -> int:
    try:
        url_dono, url_app = e2e_ambiente.configurar()
        senha_admin = e2e_preparar._senha("CAPTURAS_SENHA_ADMIN")
        senha_demo = e2e_preparar._senha("CAPTURAS_SENHA_DEMO")
    except e2e_ambiente.AmbienteInvalido as erro:
        print(f"[capturas] {erro}", file=sys.stderr)
        return 1

    # Só depois de configurar: a API lê DATABASE_URL e APP_DB_ROLE na importação
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.core.config import settings
    from app.services import demo
    from app.services.users import criar_usuario
    from tests import banco

    dono = create_engine(url_dono)
    try:
        banco.recriar_banco(dono, settings.APP_DB_ROLE)
    finally:
        dono.dispose()

    # As contas e os dados entram pelo usuário da aplicação, como na API (RN-50)
    aplicacao = create_engine(url_app)
    try:
        with Session(aplicacao) as db:
            admin = criar_usuario(db, nome="Administrador", email=EMAIL_ADMIN, senha=senha_admin, perfil="admin")
            visitante = criar_usuario(
                db, nome="Visitante da demonstração", email=EMAIL_DEMO, senha=senha_demo, perfil="operador"
            )
            visitante.demo = True
            agora = datetime.now(timezone.utc)
            admin.senha_alterada_em = agora
            visitante.senha_alterada_em = agora
            db.commit()
            # Os mesmos dados de exemplo da recriação do DEMO_MODE (RN-54), pelos services da API
            demo._criar_dados_de_exemplo(db, admin, visitante)
    finally:
        aplicacao.dispose()
    print("[capturas] Banco estoque_e2e recriado pelas migrations, com as contas de exemplo e os dados de demonstração.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
