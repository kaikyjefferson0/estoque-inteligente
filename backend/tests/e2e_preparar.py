"""Prepara o banco estoque_e2e: recria pelas migrations (com APP_DB_ROLE) e cria um admin e um operador.

Uso (o npm run test:e2e chama sozinho, dentro de backend):
    py -m tests.e2e_preparar          # banco só com o admin e o operador (estoque.spec.ts)
    py -m tests.e2e_preparar --demo   # e mais os dados de exemplo do DEMO_MODE e os casos extremos
                                      # de texto e número (responsividade.spec.ts)

As senhas chegam por variável de ambiente (E2E_SENHA_ADMIN e E2E_SENHA_OPERADOR),
geradas na hora pelo frontend\\e2e\\rodar.mjs; nada é gravado em arquivo.
"""

import os
import secrets
import sys
from datetime import timedelta

from tests import e2e_ambiente

EMAIL_ADMIN = "admin.e2e@exemplo.com.br"
EMAIL_OPERADOR = "operador.e2e@exemplo.com.br"

# Casos extremos da revisão de responsividade (os mesmos textos ficam no responsividade.spec.ts)
FORNECEDOR_LONGO = "Distribuidora Nacional de Alimentos, Bebidas e Produtos de Limpeza Ltda"
PRODUTO_LONGO = "Achocolatado em pó com vitaminas e minerais, pacote de 800 g"
PRODUTO_LONGO_SEM_ESTOQUE = "Desinfetante perfumado para uso geral, lavanda, galão de 5 L"
USUARIO_LONGO = "Maria Aparecida dos Santos Albuquerque de Oliveira Figueiredo"
EMAIL_LONGO = "maria.aparecida.albuquerque.figueiredo@distribuidoras.com.br"
SALDO_GRANDE = 99_999


def _senha(variavel: str) -> str:
    senha = os.getenv(variavel, "")
    if len(senha) < 8:
        raise e2e_ambiente.AmbienteInvalido(f"{variavel} ausente ou curta: rode pelo npm run test:e2e.")
    return senha


def _criar_demo_e_casos_extremos(db, admin, operador) -> None:
    """Os dados de exemplo da recriação do DEMO_MODE (RN-54), mais textos de 60 caracteres e
    um saldo de 99.999, para a revisão de responsividade."""
    from app.core.clock import hoje
    from app.services import alerts, demo, stock
    from app.services.products import criar_produto
    from app.services.suppliers import criar_fornecedor
    from app.services.users import criar_usuario

    demo._criar_dados_de_exemplo(db, admin, operador)

    # Senha descartável: ninguém entra com este usuário, ele só aparece nas listas
    longo = criar_usuario(db, nome=USUARIO_LONGO, email=EMAIL_LONGO, senha=secrets.token_urlsafe(18), perfil="operador")
    fornecedor = criar_fornecedor(db, nome=FORNECEDOR_LONGO, cnpj="11444777000161")
    # Estoque baixo com número grande (99.999 abaixo de 100.000) e lote a vencer em 3 dias
    grande = criar_produto(
        db,
        nome=PRODUTO_LONGO,
        codigo_barras="7896000000998",
        estoque_minimo=SALDO_GRANDE + 1,
        controla_validade=True,
        dias_alerta_validade=10,
        fornecedor_id=fornecedor.id,
    )
    sem_estoque = criar_produto(
        db,
        nome=PRODUTO_LONGO_SEM_ESTOQUE,
        codigo_barras="7896000000981",
        estoque_minimo=5,
        controla_validade=False,
        dias_alerta_validade=None,
        fornecedor_id=fornecedor.id,
    )
    for produto in (grande, sem_estoque):
        alerts.gerar_alertas_produto(db, produto.id)
        db.commit()
    stock.registrar_entrada(db, longo, grande.codigo_barras, SALDO_GRANDE, hoje() + timedelta(days=3))


def main() -> int:
    com_demo = "--demo" in sys.argv[1:]
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
            admin = criar_usuario(db, nome="Admin E2E", email=EMAIL_ADMIN, senha=senha_admin, perfil="admin")
            operador = criar_usuario(db, nome="Operador E2E", email=EMAIL_OPERADOR, senha=senha_operador, perfil="operador")
            if com_demo:
                _criar_demo_e_casos_extremos(db, admin, operador)
    finally:
        aplicacao.dispose()
    extra = ", com os dados de exemplo da demo e os casos extremos" if com_demo else ""
    print(f"[e2e] Banco recriado pelas migrations; admin e operador criados{extra}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
