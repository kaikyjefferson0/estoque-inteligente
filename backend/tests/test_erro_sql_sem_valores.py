"""CT-103 / RN-66: um erro de SQL não leva para o log os valores enviados ao banco (hide_parameters).

Vale para os engines do projeto: o da API, o das migrations (alembic\\env.py), o da recriação da demo e
o da sincronização de permissões.
"""

import traceback
from types import SimpleNamespace

import pytest
from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import DataError
from sqlalchemy.orm import Session

from app.core import database, migracoes
from app.core.database import get_db
from app.main import app
from app.routers import auth as rota_de_login
from app.scripts import sincronizar_permissoes
from app.services import demo

SEGREDO = "valor-que-nao-pode-ir-para-o-log"
# A conta que estourava (500) antes da RN-65, com um valor sigiloso entre os parâmetros
CONTA = text("SELECT CAST(:a AS integer) + CAST(:b AS integer), CAST(:segredo AS text)")
VALORES = {"a": 2_147_483_647, "b": 1234567, "segredo": SEGREDO}


def provocar_erro(engine) -> DataError:
    with engine.connect() as conexao, pytest.raises(DataError) as erro:
        conexao.execute(CONTA, VALORES)
    return erro.value


def como_no_log(erro: Exception) -> str:
    """O texto que o Uvicorn manda para o log num erro 500: o traceback inteiro, com a causa."""
    return "".join(traceback.format_exception(erro))


def test_ct103_contraprova_sem_hide_parameters_o_erro_traz_os_valores(engine):
    comum = create_engine(engine.url)
    try:
        log = como_no_log(provocar_erro(comum))
    finally:
        comum.dispose()
    assert SEGREDO in log and "1234567" in log


def test_ct103_erro_do_engine_do_projeto_nao_traz_os_valores(engine):
    do_projeto = database.criar_engine(engine.url)
    try:
        erro = provocar_erro(do_projeto)
    finally:
        do_projeto.dispose()
    log = como_no_log(erro)
    assert SEGREDO not in log and "1234567" not in log
    assert "SQL parameters hidden due to hide_parameters=True" in log
    assert erro.orig.sqlstate == "22003"  # o motivo do erro continua lá


def test_ct103_engine_da_api_esconde_os_valores():
    assert database.engine.hide_parameters is True


def test_ct103_500_da_api_nao_mostra_os_valores(engine, monkeypatch):
    """Numa rota de verdade (o login, que recebe a senha), com o engine do projeto."""
    do_projeto = database.criar_engine(engine.url)

    def get_db_do_projeto():
        with Session(do_projeto) as sessao:
            yield sessao

    def falhar(db, email, senha):
        db.execute(CONTA, VALORES | {"segredo": senha})

    monkeypatch.setattr(rota_de_login.service, "autenticar", falhar)
    monkeypatch.setitem(app.dependency_overrides, get_db, get_db_do_projeto)
    dados = {"username": "a@b.com", "password": SEGREDO}
    try:
        with pytest.raises(DataError) as erro:
            TestClient(app).post("/auth/login", data=dados)
        resposta = TestClient(app, raise_server_exceptions=False).post("/auth/login", data=dados)
    finally:
        do_projeto.dispose()
    assert SEGREDO not in como_no_log(erro.value)
    assert resposta.status_code == 500
    assert SEGREDO not in resposta.text


class Parou(Exception):
    pass


URL_DE_NINGUEM = "postgresql+psycopg://ninguem@127.0.0.1:1/nada_test"


@pytest.fixture
def engines_criados(monkeypatch):
    """Engines criados por quem usa criar_engine, parados antes de chegar a qualquer banco."""
    engines = []
    criar_original = database.criar_engine

    def criar_e_parar(url, **opcoes):
        engine = criar_original(url, **opcoes)

        @event.listens_for(engine, "do_connect")
        def parar(*_):
            raise Parou

        engines.append(engine)
        return engine

    monkeypatch.setattr(demo, "criar_engine", criar_e_parar)
    monkeypatch.setattr(sincronizar_permissoes, "criar_engine", criar_e_parar)
    return engines


def test_ct103_engine_da_recriacao_da_demo_esconde_os_valores(engines_criados):
    config = demo.ConfigDemo(
        url_dono=URL_DE_NINGUEM,
        app_db_role="",
        admin_email="admin@exemplo.com",
        admin_senha="senha-de-teste",
        demo_email="demo@exemplo.com",
        demo_senha="senha-de-teste",
    )
    for recriar in (demo.recriar, demo.recriar_se_preciso):
        with pytest.raises(Parou):
            recriar(config)
    assert [e.hide_parameters for e in engines_criados] == [True, True]


def test_ct103_engine_da_sincronizacao_de_permissoes_esconde_os_valores(engines_criados, monkeypatch):
    falsos = SimpleNamespace(
        APP_DB_ROLE="app_test", MIGRATIONS_DATABASE_URL=URL_DE_NINGUEM, MIGRATIONS_DATABASE_URL_DEFINIDA=True
    )
    monkeypatch.setattr(sincronizar_permissoes, "settings", falsos)
    with pytest.raises(Parou):
        sincronizar_permissoes.main()
    assert [e.hide_parameters for e in engines_criados] == [True]


def test_ct103_engine_das_migrations_esconde_os_valores(engine, monkeypatch):
    """Roda o alembic\\env.py de verdade (o comando `current` só lê a versão) e olha o engine que ele abriu."""
    engines = []
    configurar = MigrationContext.configure.__func__

    def espiar(cls, connection=None, *args, **opcoes):
        engines.append(connection.engine)
        return configurar(cls, connection, *args, **opcoes)

    monkeypatch.setattr(MigrationContext, "configure", classmethod(espiar))
    config = Config()
    config.set_main_option("script_location", str(migracoes.PASTA_BACKEND / "alembic"))
    config.attributes["url"] = engine.url.render_as_string(hide_password=False)
    command.current(config)
    assert engines and all(e.hide_parameters for e in engines)
