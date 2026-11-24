"""CT-93 / RN-60: a migration 30a97c4f4643 cria products.preco NUMERIC(10,2) nula e a CHECK
ck_products_preco_nao_negativo, sem preencher nada; o downgrade tira as duas.

O env.py do Alembic abre a própria conexão, então os testes rodam o upgrade() e o downgrade() da
migration com o Operations do Alembic ligado à conexão do teste. No PostgreSQL o DDL é transacional:
tudo é desfeito no fim, com a transação. O caminho pelo `alembic upgrade head` roda em toda sessão do
pytest, que recria o banco de testes por todas as migrations.
"""

import importlib.util
from decimal import Decimal
from pathlib import Path

import pytest
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory
from sqlalchemy import text

from app.core import migracoes

ARQUIVO = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "30a97c4f4643_preco_do_produto_em_numeric.py"


def _carregar_migration():
    spec = importlib.util.spec_from_file_location("migracao_preco_do_produto", ARQUIVO)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


migracao = _carregar_migration()


def rodar(db, passo) -> None:
    """Roda migracao.upgrade ou migracao.downgrade na conexão (e na transação) do teste."""
    with Operations.context(MigrationContext.configure(db.connection())):
        passo()


def coluna(db) -> dict | None:
    linha = db.execute(
        text(
            "SELECT data_type, numeric_precision, numeric_scale, is_nullable, column_default"
            " FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'preco'"
        )
    ).mappings().one_or_none()
    return dict(linha) if linha else None


def restricao(db) -> str | None:
    return db.execute(
        text("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = :nome"),
        {"nome": migracao.RESTRICAO},
    ).scalar_one_or_none()


def inserir_sem_preco(db, nome: str, codigo: str) -> int:
    """Como um produto gravado antes da migration (sem a coluna preco)."""
    return db.execute(
        text("INSERT INTO products (nome, codigo_barras, estoque_minimo) VALUES (:nome, :codigo, 3) RETURNING id"),
        {"nome": nome, "codigo": codigo},
    ).scalar_one()


@pytest.fixture
def banco_antes_da_migration(db):
    """O banco como estava antes da migration (desfeito no fim, com a transação)."""
    rodar(db, migracao.downgrade)
    return db


def test_ct93_migration_esta_aplicada(db):
    """Aplicada: é a revisão do banco ou uma das anteriores a ela (não exige ser a head, para não
    quebrar quando vier a próxima migration)."""
    config = Config()
    config.set_main_option("script_location", str(migracoes.PASTA_BACKEND / "alembic"))
    atual = db.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
    aplicadas = {script.revision for script in ScriptDirectory.from_config(config).iterate_revisions(atual, "base")}
    assert migracao.revision in aplicadas
    assert migracao.down_revision == "9a0c1c19b39f"


def test_ct93_coluna_e_check_como_a_rn60_pede(db):
    assert coluna(db) == {
        "data_type": "numeric",
        "numeric_precision": 10,
        "numeric_scale": 2,
        "is_nullable": "YES",
        "column_default": None,
    }
    assert restricao(db) == "CHECK ((preco >= (0)::numeric))"


def test_ct93_downgrade_tira_a_coluna_e_a_check(banco_antes_da_migration):
    db = banco_antes_da_migration
    assert coluna(db) is None
    assert restricao(db) is None


def test_ct93_upgrade_deixa_os_produtos_antigos_sem_preco(banco_antes_da_migration):
    db = banco_antes_da_migration
    leite = inserir_sem_preco(db, "Leite integral 1 L", "7891000000201")
    arroz = inserir_sem_preco(db, "Arroz tipo 1", "7891000000202")

    rodar(db, migracao.upgrade)

    assert coluna(db)["is_nullable"] == "YES"
    assert restricao(db) is not None
    precos = db.execute(
        text("SELECT id, preco FROM products WHERE id IN (:leite, :arroz) ORDER BY id"),
        {"leite": leite, "arroz": arroz},
    ).all()
    assert [tuple(linha) for linha in precos] == [(leite, None), (arroz, None)]  # nada preenchido
    # Os outros campos continuam iguais
    assert db.execute(text("SELECT estoque_minimo FROM products WHERE id = :id"), {"id": leite}).scalar_one() == 3
    # Depois do upgrade, um produto antigo pode ganhar preço
    db.execute(text("UPDATE products SET preco = 5.49 WHERE id = :id"), {"id": leite})
    assert db.execute(text("SELECT preco FROM products WHERE id = :id"), {"id": leite}).scalar_one() == Decimal("5.49")


def test_ct93_downgrade_e_upgrade_de_novo_com_precos_gravados(db, detergente):
    db.execute(text("UPDATE products SET preco = 2.59 WHERE id = :id"), {"id": detergente.id})

    rodar(db, migracao.downgrade)
    assert coluna(db) is None
    rodar(db, migracao.upgrade)

    # O downgrade perde o preço (a coluna some); o produto continua lá, sem preço
    assert db.execute(text("SELECT preco FROM products WHERE id = :id"), {"id": detergente.id}).scalar_one() is None
    assert restricao(db) is not None
