from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

import app.models  # noqa: F401  (registra as tabelas no Base.metadata)
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token
from app.main import app
from app.services.users import criar_usuario

SENHA_ADMIN = "senha-do-admin-123"
SENHA_OPERADOR = "senha-do-operador-123"


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


@pytest.fixture(scope="session")
def engine():
    engine = create_engine(_url_do_banco_de_teste())
    Base.metadata.drop_all(engine)  # limpa sobra de uma execução interrompida
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)
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
