"""RN-50: o usuário de banco da API não altera a estrutura e, no histórico, só lê e insere.

Conectam com TEST_APP_DATABASE_URL (o banco _test com o usuário da aplicação). Sem a
variável, os testes são pulados: numa instalação com um usuário só não há o que conferir.
"""
from collections.abc import Generator

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, make_url
from sqlalchemy.exc import DBAPIError

from app.core.config import settings

# SQLSTATE do Postgres para "permission denied" e "must be owner"
SEM_PERMISSAO = "42501"


@pytest.fixture(scope="module")
def conexao_app(engine) -> Generator[Connection, None, None]:
    """Conexão como usuário da aplicação no mesmo banco _test que o conftest criou."""
    url = settings.TEST_APP_DATABASE_URL
    if not url:
        pytest.skip(
            "TEST_APP_DATABASE_URL não definida no backend\\.env: testes de permissão do "
            "usuário da aplicação (CT-60, CT-61) pulados."
        )
    if make_url(url).database != engine.url.database:
        pytest.fail("TEST_APP_DATABASE_URL precisa apontar para o mesmo banco da TEST_DATABASE_URL.")
    if make_url(url).username == engine.url.username:
        pytest.fail("TEST_APP_DATABASE_URL usa o mesmo usuário dono da TEST_DATABASE_URL; use o usuário da aplicação.")

    engine_app = create_engine(url)
    with engine_app.connect() as conexao:
        yield conexao
    engine_app.dispose()


def assert_recusado_por_permissao(conexao: Connection, sql: str) -> None:
    with pytest.raises(DBAPIError) as erro:
        conexao.execute(text(sql))
    conexao.rollback()
    assert erro.value.orig.sqlstate == SEM_PERMISSAO, f"{sql!r} falhou, mas não por permissão: {erro.value.orig}"


def tem_permissao(conexao: Connection, tabela: str, privilegio: str) -> bool:
    resultado = conexao.scalar(
        text("SELECT has_table_privilege(current_user, :tabela, :privilegio)"),
        {"tabela": tabela, "privilegio": privilegio},
    )
    conexao.rollback()
    return resultado


def test_ct60_app_nao_altera_nem_apaga_historico_nem_desliga_trigger(conexao_app):
    """CT-60 / RN-50, RN-12: recusado pela permissão, antes mesmo do trigger."""
    assert_recusado_por_permissao(conexao_app, "UPDATE stock_movements SET quantidade = quantidade + 1")
    assert_recusado_por_permissao(conexao_app, "DELETE FROM stock_movements")
    assert_recusado_por_permissao(conexao_app, "TRUNCATE stock_movements")
    assert_recusado_por_permissao(conexao_app, "ALTER TABLE stock_movements DISABLE TRIGGER trg_stock_movements_imutavel")
    assert_recusado_por_permissao(conexao_app, "DROP TRIGGER trg_stock_movements_imutavel ON stock_movements")


def test_ct60_app_continua_lendo_e_inserindo_no_historico(conexao_app):
    """RN-50: a permissão mínima ainda deixa a API registrar e consultar movimentações."""
    assert tem_permissao(conexao_app, "stock_movements", "SELECT")
    assert tem_permissao(conexao_app, "stock_movements", "INSERT")
    assert not tem_permissao(conexao_app, "stock_movements", "UPDATE")
    assert not tem_permissao(conexao_app, "stock_movements", "DELETE")
    # As outras tabelas a API grava normalmente (lotes, alertas, cadastros)
    for tabela in ("users", "suppliers", "products", "batches", "alerts"):
        for privilegio in ("SELECT", "INSERT", "UPDATE", "DELETE"):
            assert tem_permissao(conexao_app, tabela, privilegio), f"{privilegio} em {tabela}"


def test_ct61_app_nao_cria_nem_altera_tabelas(conexao_app):
    """CT-61 / RN-50."""
    assert_recusado_por_permissao(conexao_app, "CREATE TABLE tabela_intrusa (id integer)")
    assert_recusado_por_permissao(conexao_app, "ALTER TABLE products ADD COLUMN coluna_intrusa integer")
    assert_recusado_por_permissao(conexao_app, "DROP TABLE alerts")
    assert_recusado_por_permissao(conexao_app, "SELECT * FROM alembic_version")
