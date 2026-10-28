"""Sobe a API do teste de ponta a ponta: porta 8001, banco estoque_e2e com o usuário da aplicação
e CORS liberado só para o site da porta 5175.

Uso (o npm run test:e2e chama sozinho, dentro de backend):
    py -m tests.e2e_api
"""

import sys

from tests import e2e_ambiente


def main() -> int:
    try:
        e2e_ambiente.configurar()
    except e2e_ambiente.AmbienteInvalido as erro:
        print(f"[e2e] {erro}", file=sys.stderr)
        return 1

    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=e2e_ambiente.PORTA_API, log_level="warning")
    return 0


if __name__ == "__main__":
    sys.exit(main())
