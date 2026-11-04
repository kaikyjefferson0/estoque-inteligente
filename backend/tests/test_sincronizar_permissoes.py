"""RN-50 e RN-58: permissões em banco novo e em banco já migrado sem a APP_DB_ROLE (CT-77 a CT-81).

Os testes com banco conectam como o usuário da aplicação (TEST_APP_DATABASE_URL). Sem a variável,
são pulados, como os de test_permissoes_banco.py.
"""
from collections.abc import Generator, Iterator
from contextlib import contextmanager

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine, make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app import main as modulo_main
from app.core import migracoes, permissoes
from app.core.config import settings, validar_usuarios_do_banco
from app.scripts import sincronizar_permissoes
from app.services.suppliers import criar_fornecedor
from tests import banco

SEM_PERMISSAO = "42501"
URL_APP = "postgresql+psycopg://estoque_app:x@host/banco"
URL_DONO = "postgresql+psycopg://dono:x@host/banco"


# --- Ambiente ---


@pytest.fixture
def papel(engine) -> Generator[str, None, None]:
    """Usuário da aplicação; no fim, o banco _test volta ao estado normal dos outros testes."""
    url = settings.TEST_APP_DATABASE_URL
    if not url:
        pytest.skip("TEST_APP_DATABASE_URL não definida no backend\\.env: testes de permissão pulados.")
    try:
        yield make_url(url).username
    finally:
        banco.recriar_banco(engine, settings.APP_DB_ROLE)


@pytest.fixture
def engine_app() -> Generator[Engine, None, None]:
    # NullPool: nenhuma conexão parada segura as tabelas quando o banco é recriado
    engine = create_engine(settings.TEST_APP_DATABASE_URL, poolclass=NullPool)
    yield engine
    engine.dispose()


@pytest.fixture
def script(engine, papel, monkeypatch):
    """O script de verdade apontado para o banco _test, como o settings faz no deploy."""
    monkeypatch.setattr(settings, "MIGRATIONS_DATABASE_URL", engine.url.render_as_string(hide_password=False))
    monkeypatch.setattr(settings, "MIGRATIONS_DATABASE_URL_DEFINIDA", True)
    monkeypatch.setattr(settings, "APP_DB_ROLE", papel)
    return sincronizar_permissoes.main


def _sem_nenhuma_permissao(engine: Engine, papel: str) -> None:
    """Banco como na produção: migrations sem a role e nenhum resto de default privileges.
    Sem limpar antes, as tabelas nasceriam liberadas por uma execução anterior e o teste não provaria nada."""
    banco.apagar_tudo(engine)
    q = engine.dialect.identifier_preparer.quote(papel)
    padrao = f"ALTER DEFAULT PRIVILEGES FOR ROLE {engine.dialect.identifier_preparer.quote(engine.url.username)} IN SCHEMA public"
    with engine.begin() as conexao:
        conexao.exec_driver_sql(f"{padrao} REVOKE ALL ON TABLES FROM {q}")
        conexao.exec_driver_sql(f"{padrao} REVOKE ALL ON SEQUENCES FROM {q}")
    banco.recriar_banco(engine, "")


def _problemas(engine: Engine, papel: str) -> list[str]:
    with engine.connect() as conexao:
        return permissoes.problemas_de_permissao(conexao, papel)


def _assert_negado(engine_app: Engine, sql: str) -> None:
    with engine_app.connect() as conexao:
        with pytest.raises(DBAPIError) as erro:
            conexao.execute(text(sql))
    assert erro.value.orig.sqlstate == SEM_PERMISSAO, str(erro.value.orig)


def _assert_permissoes_certas(engine_app: Engine) -> None:
    """O que a API faz de verdade, conectada como o usuário da aplicação."""
    with engine_app.connect() as conexao:
        permissoes.verificar_usuario_da_aplicacao(conexao)
        assert conexao.scalar(text("SELECT count(*) FROM users")) >= 0
        assert conexao.scalar(text("SELECT count(*) FROM stock_movements")) >= 0
        conexao.rollback()

        # INSERT real: precisa da tabela e do USAGE na sequência; desfeito no fim
        transacao = conexao.begin()
        sessao = Session(bind=conexao, join_transaction_mode="create_savepoint", expire_on_commit=False)
        try:
            assert criar_fornecedor(sessao, nome="Fornecedor do teste de permissões").id > 0
        finally:
            sessao.close()
            transacao.rollback()

    for sql in (
        "UPDATE stock_movements SET quantidade = quantidade + 1",
        "DELETE FROM stock_movements",
        "TRUNCATE stock_movements",
        "SELECT * FROM alembic_version",
        "SELECT * FROM demo_resets",
        "SELECT last_value FROM users_id_seq",
        "SELECT setval('users_id_seq', 1)",
        "CREATE TABLE tabela_intrusa (id integer)",
    ):
        _assert_negado(engine_app, sql)


@contextmanager
def _producao(monkeypatch, engine_app: Engine) -> Iterator[None]:
    monkeypatch.setattr(settings, "APP_ENV", "production")
    monkeypatch.setattr(modulo_main, "engine", engine_app)
    yield


# --- CT-77: migrations aplicadas sem a APP_DB_ROLE e depois corrigidas ---


def test_ct77_migrations_sem_a_role_e_depois_corrigidas(engine, papel, engine_app, script, capsys):
    _sem_nenhuma_permissao(engine, papel)
    _assert_negado(engine_app, "SELECT * FROM users")

    # O deploy seguinte, agora com a variável: o Alembic não tem nada pendente e não concede nada
    migracoes.subir_migrations(engine, papel)
    _assert_negado(engine_app, "SELECT * FROM users")

    assert script() == 0
    _assert_permissoes_certas(engine_app)

    # Idempotente: a segunda vez roda sem erro e chega ao mesmo resultado
    assert script() == 0
    _assert_permissoes_certas(engine_app)
    assert _problemas(engine, papel) == []

    saida = capsys.readouterr()
    assert saida.err == ""
    assert f"para {papel}" in saida.out and "stock_movements só com SELECT e INSERT" in saida.out


def test_ct77_resumo_do_script_nao_mostra_segredos(engine, script, capsys):
    assert script() == 0
    saida = capsys.readouterr().out
    assert engine.url.password and engine.url.password not in saida
    assert "://" not in saida and str(engine.url.host) not in saida


def test_ct77_banco_novo_ja_nasce_com_as_permissoes(engine, papel, engine_app):
    _sem_nenhuma_permissao(engine, papel)
    banco.recriar_banco(engine, papel)
    _assert_permissoes_certas(engine_app)


# --- CT-78: a sincronização deixa exatamente o combinado ---


def test_ct78_remove_permissao_a_mais(engine, papel, engine_app, script):
    q = engine.dialect.identifier_preparer.quote(papel)
    with engine.begin() as conexao:
        conexao.exec_driver_sql(f"GRANT ALL ON stock_movements, alembic_version, demo_resets, users TO {q}")
        conexao.exec_driver_sql(f"GRANT ALL ON SEQUENCE users_id_seq, demo_resets_id_seq TO {q}")
        conexao.exec_driver_sql(f"GRANT CREATE ON SCHEMA public TO {q}")
    assert any("stock_movements: UPDATE indevido" in p for p in _problemas(engine, papel))

    assert script() == 0
    assert _problemas(engine, papel) == []
    _assert_permissoes_certas(engine_app)


def test_ct78_connect_e_usage_concedidos_explicitamente(engine, papel, script):
    """Não basta valer pelo PUBLIC: o CONNECT e o USAGE ficam registrados para o próprio usuário,
    mesmo que tenham sido revogados dele, e rodar de novo não os remove."""
    q = engine.dialect.identifier_preparer.quote(papel)
    banco_q = engine.dialect.identifier_preparer.quote(engine.url.database)
    with engine.begin() as conexao:
        conexao.exec_driver_sql(f"REVOKE CONNECT ON DATABASE {banco_q} FROM {q}")
        conexao.exec_driver_sql(f"REVOKE USAGE ON SCHEMA public FROM {q}")

    def concedidos() -> tuple[bool, bool]:
        with engine.connect() as conexao:
            consulta = (
                "SELECT EXISTS (SELECT 1 FROM {tabela} t, aclexplode(t.{coluna}) a "
                "JOIN pg_roles r ON r.oid = a.grantee "
                "WHERE {filtro} AND r.rolname = :papel AND a.privilege_type = :privilegio)"
            )
            connect = conexao.scalar(
                text(consulta.format(tabela="pg_database", coluna="datacl", filtro="t.datname = current_database()")),
                {"papel": papel, "privilegio": "CONNECT"},
            )
            usage = conexao.scalar(
                text(consulta.format(tabela="pg_namespace", coluna="nspacl", filtro="t.nspname = 'public'")),
                {"papel": papel, "privilegio": "USAGE"},
            )
            return connect, usage

    assert concedidos() == (False, False)
    assert script() == 0
    assert concedidos() == (True, True)
    assert script() == 0
    assert concedidos() == (True, True)


def test_ct78_default_privileges_do_dono_liberam_o_minimo_nas_tabelas_novas(engine, papel, script):
    assert script() == 0
    with engine.connect() as conexao:
        conexao.execute(text("CREATE TABLE tabela_nova (id serial PRIMARY KEY)"))
        escrita = conexao.scalar(
            text("SELECT has_table_privilege(:p, 'tabela_nova', 'SELECT, INSERT, UPDATE, DELETE')"), {"p": papel}
        )
        truncate = conexao.scalar(text("SELECT has_table_privilege(:p, 'tabela_nova', 'TRUNCATE')"), {"p": papel})
        usage = conexao.scalar(text("SELECT has_sequence_privilege(:p, 'tabela_nova_id_seq', 'USAGE')"), {"p": papel})
        leitura = conexao.scalar(text("SELECT has_sequence_privilege(:p, 'tabela_nova_id_seq', 'SELECT')"), {"p": papel})
        donos = conexao.scalars(
            text(
                "SELECT DISTINCT d.defaclrole::regrole::text FROM pg_default_acl d, aclexplode(d.defaclacl) a "
                "JOIN pg_roles r ON r.oid = a.grantee WHERE r.rolname = :p"
            ),
            {"p": papel},
        ).all()
        conexao.rollback()  # a tabela nova some junto
    assert (escrita, truncate, usage, leitura) == (True, False, True, False)
    assert donos == [engine.url.username]


# --- CT-79: recusas da sincronização ---


def test_ct79_recusa_usuario_inexistente_sem_mudar_nada(engine, papel):
    antes = _problemas(engine, papel)
    with pytest.raises(permissoes.PermissoesError, match="não existe"):
        with engine.begin() as conexao:
            permissoes.sincronizar(conexao, "usuario_que_nao_existe", engine.url.username)
    assert _problemas(engine, papel) == antes


def test_ct79_recusa_o_proprio_dono(engine, papel):
    with pytest.raises(permissoes.PermissoesError, match="usuário dono"):
        with engine.begin() as conexao:
            permissoes.sincronizar(conexao, engine.url.username, engine.url.username)


def test_ct79_recusa_banco_sem_as_migrations(engine, papel):
    banco.apagar_tudo(engine)
    with pytest.raises(permissoes.PermissoesError, match="alembic upgrade head"):
        with engine.begin() as conexao:
            permissoes.sincronizar(conexao, papel, engine.url.username)


@pytest.mark.parametrize(
    ("atributos", "mensagem"),
    [
        ({"APP_DB_ROLE": ""}, "APP_DB_ROLE"),
        ({"MIGRATIONS_DATABASE_URL_DEFINIDA": False}, "MIGRATIONS_DATABASE_URL"),
    ],
)
def test_ct79_script_sem_configuracao_termina_com_erro(script, monkeypatch, capsys, atributos, mensagem):
    for nome, valor in atributos.items():
        monkeypatch.setattr(settings, nome, valor)
    assert script() == 1
    assert mensagem in capsys.readouterr().err


# --- CT-80: trava da configuração em produção ---


@pytest.mark.parametrize(
    ("database_url", "migrations_url", "papel_", "mensagem"),
    [
        (URL_APP, URL_DONO, "", "defina APP_DB_ROLE"),
        (URL_APP, "", "estoque_app", "defina MIGRATIONS_DATABASE_URL"),
        (URL_DONO, URL_DONO, "estoque_app", "DATABASE_URL precisa usar"),
        (URL_APP, URL_APP, "estoque_app", "precisa usar o dono"),
        ("isso nao e url", URL_DONO, "estoque_app", "DATABASE_URL não é uma URL"),
    ],
)
def test_ct80_producao_recusa_usuarios_errados(database_url, migrations_url, papel_, mensagem):
    with pytest.raises(RuntimeError, match=mensagem) as erro:
        validar_usuarios_do_banco("production", database_url, migrations_url, papel_)
    assert ":x@" not in str(erro.value)


def test_ct80_configuracoes_validas_sobem():
    validar_usuarios_do_banco("production", URL_APP, URL_DONO, "estoque_app")
    # Fora de produção, um usuário só continua valendo
    validar_usuarios_do_banco("development", URL_DONO, "", "")


# --- CT-81: verificação ao subir a API ---


def test_ct81_api_em_producao_nao_sobe_sem_permissao(engine, papel, engine_app, monkeypatch):
    _sem_nenhuma_permissao(engine, papel)
    with _producao(monkeypatch, engine_app), pytest.raises(permissoes.PermissoesError, match="falta SELECT"):
        with TestClient(modulo_main.criar_app()):
            pytest.fail("A API não devia ter subido.")


def test_ct81_api_em_producao_nao_sobe_com_historico_alteravel(engine, papel, engine_app, monkeypatch):
    q = engine.dialect.identifier_preparer.quote(papel)
    with engine.begin() as conexao:
        conexao.exec_driver_sql(f"GRANT UPDATE, DELETE ON stock_movements TO {q}")
    with _producao(monkeypatch, engine_app), pytest.raises(permissoes.PermissoesError, match="UPDATE indevido"):
        with TestClient(modulo_main.criar_app()):
            pytest.fail("A API não devia ter subido.")


def test_ct81_api_em_producao_sobe_depois_da_sincronizacao(engine, papel, engine_app, script, monkeypatch):
    _sem_nenhuma_permissao(engine, papel)
    assert script() == 0
    with _producao(monkeypatch, engine_app):
        with TestClient(modulo_main.criar_app()) as cliente:
            assert cliente.get("/health").status_code == 200


def _conexao_nao_usada(_: Connection) -> None:  # pragma: no cover
    raise AssertionError("A verificação não devia rodar fora de produção.")


def test_ct81_fora_de_producao_nao_verifica(monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.setattr(permissoes, "verificar_usuario_da_aplicacao", _conexao_nao_usada)
    with TestClient(modulo_main.criar_app()) as cliente:
        assert cliente.get("/health").status_code == 200
