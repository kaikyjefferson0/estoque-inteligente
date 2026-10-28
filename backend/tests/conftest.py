from collections.abc import Generator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registra as tabelas no Base.metadata)
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.limiter import limiter
from app.core.security import create_access_token
from app.main import app
from app.services.products import criar_produto
from app.services.suppliers import criar_fornecedor
from app.services.users import criar_usuario

SENHA_ADMIN = "senha-do-admin-123"
SENHA_OPERADOR = "senha-do-operador-123"
PASTA_BACKEND = Path(__file__).resolve().parents[1]


def _url_do_banco_de_teste() -> str:
    """Proteção: nunca roda contra um banco cujo nome não termine em _test."""
    url = settings.TEST_DATABASE_URL.strip()
    if not url:
        pytest.exit("TEST_DATABASE_URL não definida no backend\\.env.", returncode=1)
    nome = make_url(url).database or ""
    if not nome.endswith("_test"):
        pytest.exit(
            f"Recusando rodar: o banco de testes '{nome}' não termina em _test.",
            returncode=1,
        )
    return url


def _apagar_tudo(engine) -> None:
    """Apaga tabelas, versão do Alembic e a função do trigger (RN-12), que o drop_all não alcança."""
    Base.metadata.drop_all(engine)
    with engine.begin() as conexao:
        conexao.execute(text("DROP TABLE IF EXISTS alembic_version"))
        conexao.execute(text("DROP FUNCTION IF EXISTS stock_movements_imutavel()"))


def recriar_banco(engine) -> None:
    """Banco _test do zero pelas migrations (as mesmas do deploy), com as permissões
    do usuário da aplicação (RN-50) quando APP_DB_ROLE estiver definida.

    Também limpa o que os testes de concorrência gravaram de verdade: o histórico
    não aceita DELETE (RN-12), então o jeito é recriar.
    """
    _apagar_tudo(engine)
    config = Config()
    config.set_main_option("script_location", str(PASTA_BACKEND / "alembic"))
    # Lidos pelo alembic\env.py e pela migration de permissões
    config.attributes["url"] = engine.url.render_as_string(hide_password=False)
    config.attributes["app_db_role"] = settings.APP_DB_ROLE
    command.upgrade(config, "head")


@pytest.fixture(scope="session")
def engine():
    engine = create_engine(_url_do_banco_de_teste())
    recriar_banco(engine)  # também limpa sobra de uma execução interrompida
    yield engine
    _apagar_tudo(engine)
    engine.dispose()


@pytest.fixture
def db(engine) -> Generator[Session, None, None]:
    """Cada teste roda dentro de uma transação desfeita no fim.

    Os commits dos services viram savepoints (create_savepoint),
    então nada do teste chega a ser gravado de verdade.
    """
    conexao = engine.connect()
    transacao = conexao.begin()
    sessao = Session(bind=conexao, join_transaction_mode="create_savepoint", expire_on_commit=False)
    try:
        yield sessao
    finally:
        sessao.close()
        transacao.rollback()
        conexao.close()


@pytest.fixture
def client(db) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def limite_de_login_zerado():
    """RN-47: a contagem de tentativas fica em memória; cada teste começa do zero."""
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
def admin(db):
    return criar_usuario(db, nome="Admin", email="admin@teste.com", senha=SENHA_ADMIN, perfil="admin")


@pytest.fixture
def operador(db):
    return criar_usuario(db, nome="Operador", email="operador@teste.com", senha=SENHA_OPERADOR, perfil="operador")


@pytest.fixture
def token_admin(admin) -> str:
    return create_access_token(admin.id)


@pytest.fixture
def token_operador(operador) -> str:
    return create_access_token(operador.id)


# --- Dados de cadastro (cabeçalho do docs\casos-de-teste.md) ---


@pytest.fixture
def fornecedor(db):
    return criar_fornecedor(db, nome="Distribuidora Central", cnpj="11222333000181")


@pytest.fixture
def refrigerante(db, fornecedor):
    return criar_produto(
        db,
        nome="Refrigerante 2L",
        codigo_barras="7891000000001",
        estoque_minimo=10,
        controla_validade=True,
        dias_alerta_validade=30,
        fornecedor_id=fornecedor.id,
    )


@pytest.fixture
def detergente(db):
    return criar_produto(db, nome="Detergente", codigo_barras="7891000000002", estoque_minimo=5)
