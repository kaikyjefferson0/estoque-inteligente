"""CT-100 / RN-26: a migration 8f3454618767 cria a CHECK ck_products_dias_alerta_validade_maximo (3650
dias). Se algum produto já passar do teto, ela para com a lista dos produtos e não altera nada.

Como no test_migracao_preco.py, os testes rodam o upgrade() e o downgrade() da migration na transação
do teste, que é desfeita no fim. O caminho pelo Alembic roda em toda sessão do pytest.
"""

import importlib.util
import time
from pathlib import Path

import pytest
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory
from psycopg.errors import LockNotAvailable
from sqlalchemy import CheckConstraint, text
from sqlalchemy.exc import IntegrityError, OperationalError

from app.core import migracoes
from app.models.product import Product
from app.schemas.products import DIAS_ALERTA_MAXIMO

ARQUIVO = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "8f3454618767_teto_dos_dias_de_alerta.py"


def _carregar_migration():
    spec = importlib.util.spec_from_file_location("migracao_teto_dos_dias_de_alerta", ARQUIVO)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


migracao = _carregar_migration()


def rodar(db, passo) -> None:
    """Roda migracao.upgrade ou migracao.downgrade na conexão (e na transação) do teste."""
    with Operations.context(MigrationContext.configure(db.connection())):
        passo()


def restricao(db) -> str | None:
    return db.execute(
        text("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = :nome"),
        {"nome": migracao.RESTRICAO},
    ).scalar_one_or_none()


def inserir_direto(db, nome: str, codigo: str, dias: int | None) -> int:
    """INSERT em SQL, fora da API e do ORM."""
    return db.execute(
        text(
            "INSERT INTO products (nome, codigo_barras, controla_validade, dias_alerta_validade)"
            " VALUES (:nome, :codigo, :controla, :dias) RETURNING id"
        ),
        {"nome": nome, "codigo": codigo, "controla": dias is not None, "dias": dias},
    ).scalar_one()


def dias_gravados(db) -> list[tuple[str, int | None]]:
    linhas = db.execute(text("SELECT nome, dias_alerta_validade FROM products ORDER BY id"))
    return [tuple(linha) for linha in linhas]


@pytest.fixture
def banco_antes_da_migration(db):
    """O banco como estava antes da migration (desfeito no fim, com a transação)."""
    rodar(db, migracao.downgrade)
    return db


def test_ct100_migration_esta_aplicada(db):
    config = Config()
    config.set_main_option("script_location", str(migracoes.PASTA_BACKEND / "alembic"))
    atual = db.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
    aplicadas = {script.revision for script in ScriptDirectory.from_config(config).iterate_revisions(atual, "base")}
    assert migracao.revision in aplicadas
    assert migracao.down_revision == "30a97c4f4643"


def test_ct100_check_do_banco_do_model_e_o_teto_da_api_sao_iguais(db):
    assert restricao(db) == "CHECK ((dias_alerta_validade <= 3650))"
    [do_model] = [
        c.sqltext.text
        for c in Product.__table__.constraints
        if isinstance(c, CheckConstraint) and c.name == migracao.RESTRICAO
    ]
    assert do_model == "dias_alerta_validade <= 3650"
    assert migracao.MAXIMO == DIAS_ALERTA_MAXIMO == 3650


def test_ct100_banco_recusa_insert_e_update_acima_do_teto(db):
    """RN-26 também no banco: 3651 fora da API é recusado pela CHECK; 3650 e NULL entram."""
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        inserir_direto(db, "Fora da API", "7891000000301", 3651)
    assert erro.value.orig.diag.constraint_name == migracao.RESTRICAO

    no_teto = inserir_direto(db, "No teto", "7891000000302", 3650)
    inserir_direto(db, "Sem validade", "7891000000303", None)
    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        db.execute(text("UPDATE products SET dias_alerta_validade = 3651 WHERE id = :id"), {"id": no_teto})
    assert erro.value.orig.diag.constraint_name == migracao.RESTRICAO
    assert dias_gravados(db) == [("No teto", 3650), ("Sem validade", None)]


def test_ct100_downgrade_tira_a_check_e_upgrade_cria_de_novo(banco_antes_da_migration):
    db = banco_antes_da_migration
    assert restricao(db) is None
    inserir_direto(db, "No teto", "7891000000302", 3650)
    inserir_direto(db, "Sem validade", "7891000000303", None)

    rodar(db, migracao.upgrade)

    assert restricao(db) == "CHECK ((dias_alerta_validade <= 3650))"
    assert dias_gravados(db) == [("No teto", 3650), ("Sem validade", None)]
    # Tempo limite da trava ligado na transação da migration (SET LOCAL: acaba junto com ela)
    assert db.execute(text("SHOW lock_timeout")).scalar_one() == "5s"


def test_ct100_lock_timeout_nao_sai_da_transacao_da_migration(engine):
    with engine.connect() as conexao:
        with Operations.context(MigrationContext.configure(conexao)):
            migracao.downgrade()
            migracao.upgrade()
        # commit, não rollback: um SET sem LOCAL também some no rollback, e o teste não provaria nada.
        # O downgrade seguido do upgrade deixa a estrutura como estava
        conexao.commit()
        assert conexao.execute(text("SHOW lock_timeout")).scalar_one() == "0"


def test_ct100_confere_os_produtos_com_a_tabela_ja_travada(engine, monkeypatch):
    """Sem a trava antes da conferência, a API antiga poderia gravar 4000 dias entre as duas."""
    travas = []

    def espiar(conexao):
        travas.append(
            conexao.execute(
                text(
                    "SELECT mode FROM pg_locks WHERE pid = pg_backend_pid() AND granted"
                    " AND relation = 'products'::regclass AND mode = 'AccessExclusiveLock'"
                )
            ).scalar_one_or_none()
        )

    monkeypatch.setattr(migracao, "conferir_produtos", espiar)
    # A CHECK já existe no banco de testes: aqui só interessa a ordem entre a trava e a conferência
    monkeypatch.setattr(migracao.op, "create_check_constraint", lambda *args: None)
    with engine.connect() as conexao:
        with Operations.context(MigrationContext.configure(conexao)):
            migracao.upgrade()
        conexao.rollback()
    assert travas == ["AccessExclusiveLock"]


def test_ct100_desiste_em_5_segundos_se_a_tabela_estiver_em_uso(engine):
    with engine.connect() as outra, engine.connect() as conexao:
        outra.execute(text("SELECT 1 FROM products LIMIT 1"))  # transação aberta, como a da API antiga
        inicio = time.monotonic()
        with pytest.raises(OperationalError) as erro, Operations.context(MigrationContext.configure(conexao)):
            migracao.upgrade()
        assert isinstance(erro.value.orig, LockNotAvailable)
        assert 4 < time.monotonic() - inicio < 10
        conexao.rollback()


def test_ct100_upgrade_para_com_a_lista_se_algum_produto_passa_do_teto(banco_antes_da_migration):
    db = banco_antes_da_migration
    acima = inserir_direto(db, "Acima do teto", "7891000000301", 3651)
    inserir_direto(db, "No teto", "7891000000302", 3650)
    muito = inserir_direto(db, "Muito acima", "7891000000304", 100000)

    # Sem savepoint: um UPDATE ou a CHECK feitos antes da recusa continuariam visíveis abaixo
    with pytest.raises(migracao.DiasDeAlertaAcimaDoTetoError) as erro:
        rodar(db, migracao.upgrade)

    mensagem = str(erro.value)
    assert "8f3454618767 recusada (RN-26): 2 produto(s) com mais de 3650 dias" in mensagem
    assert "Nada foi alterado" in mensagem
    assert f"produto {acima} 'Acima do teto': 3651 dias" in mensagem
    assert f"produto {muito} 'Muito acima': 100000 dias" in mensagem
    assert "No teto" not in mensagem  # só os que passam
    # Não corrige sozinha
    assert restricao(db) is None
    assert dias_gravados(db) == [("Acima do teto", 3651), ("No teto", 3650), ("Muito acima", 100000)]


def test_ct100_nome_com_quebra_de_linha_nao_forja_linha_no_log(banco_antes_da_migration):
    db = banco_antes_da_migration
    inserir_direto(db, "Leite\n- produto 99 falso\x1b[31m", "7891000000305", 5000)
    with pytest.raises(migracao.DiasDeAlertaAcimaDoTetoError) as erro:
        migracao.conferir_produtos(db.connection())
    assert len(str(erro.value).splitlines()) == 2  # a mensagem e um produto
    assert "\x1b" not in str(erro.value)


def test_ct100_mensagem_da_migration_lista_so_os_primeiros(banco_antes_da_migration):
    db = banco_antes_da_migration
    for i in range(25):
        inserir_direto(db, f"Produto {i}", f"78910000004{i:02}", 4000)

    with pytest.raises(migracao.DiasDeAlertaAcimaDoTetoError) as erro:
        migracao.conferir_produtos(db.connection())

    assert "25 produto(s)" in str(erro.value)
    assert str(erro.value).count(": 4000 dias") == 20
    assert str(erro.value).endswith("- e mais 5")
