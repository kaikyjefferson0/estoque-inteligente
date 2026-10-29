"""Recria os dados de demonstração na hora (RN-54). Apaga todo o banco apontado!

Uso, dentro de backend: py -m app.scripts.reset_demo
Precisa de DEMO_MODE=true, MIGRATIONS_DATABASE_URL (usuário dono), ADMIN_EMAIL, ADMIN_PASSWORD
e DEMO_PASSWORD, no ambiente ou no backend\\.env.
"""

import sys

from sqlalchemy.engine import make_url

from app.core.config import settings
from app.services import demo


def main() -> int:
    try:
        config = demo.ler_config_demo(settings)
    except demo.DemoRecusadaError as erro:
        print(erro, file=sys.stderr)
        return 1

    # Só o servidor e o nome do banco, nunca usuário e senha
    url = make_url(config.url_dono)
    print(f"Recriando os dados de demonstração em {url.host}/{url.database}...")
    try:
        demo.recriar(config)
    except demo.DemoOcupadaError as erro:
        print(erro, file=sys.stderr)
        return 1
    print(f"Pronto: admin {config.admin_email} e conta de demonstração {config.demo_email} (operador).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
