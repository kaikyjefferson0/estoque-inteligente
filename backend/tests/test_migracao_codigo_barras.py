"""CT-83 / RN-04: a migration 9a0c1c19b39f tira os espaços dos códigos de barras já gravados e cria a
CHECK que faz o banco recusar código com espaço.

O env.py do Alembic abre a própria conexão, então os testes chamam as funções da migration (as mesmas
que o upgrade() chama) dentro da transação do teste, que é desfeita no fim. O caminho pelo Alembic roda
em toda sessão do pytest: o banco de testes é recriado por todas as migrations, até esta.
"""

import importlib.util
import sys
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models.product import Product

ARQUIVO = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "9a0c1c19b39f_codigo_de_barras_sem_espacos.py"


def _carregar_migration():
    spec = importlib.util.spec_from_file_location("migracao_codigo_barras_sem_espacos", ARQUIVO)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


migracao = _carregar_migration()


@pytest.fixture
def banco_antes_da_migration(db):
    """Sem a CHECK, como o banco estava antes da migration (desfeito no fim, com a transação)."""
    db.execute(text(f"ALTER TABLE products DROP CONSTRAINT {migracao.RESTRICAO}"))
    return db


def gravar(db, nome: str, codigo: str) -> Product:
    """Direto no banco, como um produto gravado antes de a API tirar os espaços (sem o service)."""
    produto = Product(nome=nome, codigo_barras=codigo, estoque_minimo=0)
    db.add(produto)
    db.flush()
    return produto


def inserir_direto(db, codigo: str) -> None:
    """INSERT em SQL, fora da API e do ORM."""
    db.execute(
        text("INSERT INTO products (nome, codigo_barras, estoque_minimo) VALUES ('Fora da API', :codigo, 0)"),
        {"codigo": codigo},
    )


def codigo_gravado(db, produto: Product) -> str:
    return db.execute(text("SELECT codigo_barras FROM products WHERE id = :id"), {"id": produto.id}).scalar_one()


def test_ct83_migration_esta_aplicada_no_banco(db):
    assert db.execute(text("SELECT version_num FROM alembic_version")).scalar_one() == migracao.revision


def test_ct83_migration_tira_os_espacos_dos_codigos_gravados(banco_antes_da_migration):
    db = banco_antes_da_migration
    leite = gravar(db, "Leite integral 1 L", "3037 3543")
    cafe = gravar(db, "Café torrado 500 g", "7 896000\r\n000011")
    arroz = gravar(db, "Arroz tipo 1", " 7891000000001\t")
    feijao = gravar(db, "Feijão carioca", "7891000000002")

    assert migracao.limpar_codigos_de_barras(db.connection()) == 3

    assert codigo_gravado(db, leite) == "30373543"
    assert codigo_gravado(db, cafe) == "7896000000011"
    assert codigo_gravado(db, arroz) == "7891000000001"
    assert codigo_gravado(db, feijao) == "7891000000002"
    # Rodar de novo não muda nada
    assert migracao.limpar_codigos_de_barras(db.connection()) == 0
    # Com os códigos limpos, a CHECK é criada (o PostgreSQL confere as linhas que já existem)
    migracao.criar_restricao(db.connection())


def test_ct83_migration_recusa_se_a_limpeza_repetir_codigos(banco_antes_da_migration):
    db = banco_antes_da_migration
    integral = gravar(db, "Leite integral 1 L", "3037 3543")
    desnatado = gravar(db, "Leite desnatado 1 L", "30373543")
    arroz = gravar(db, "Arroz tipo 1", "7891 000000001")  # seria limpo, mas nada muda

    with pytest.raises(migracao.CodigosRepetidosError) as erro:
        migracao.limpar_codigos_de_barras(db.connection())

    mensagem = str(erro.value)
    assert "Nada foi alterado" in mensagem
    assert "30373543" in mensagem
    assert f'produto {integral.id} "Leite integral 1 L"' in mensagem
    assert f'produto {desnatado.id} "Leite desnatado 1 L"' in mensagem
    assert "Arroz" not in mensagem  # só os que colidem
    assert codigo_gravado(db, integral) == "3037 3543"
    assert codigo_gravado(db, arroz) == "7891 000000001"


@pytest.mark.parametrize(
    "codigo",
    ["3037 3543", "3037\n3543", "3037\r\n3543", "3037\t3543", "3037 3543", "3037 3543", " 30373543"],
    ids=["espaco", "quebra-de-linha", "crlf", "tabulacao", "inseparavel", "inseparavel-estreito", "na-ponta"],
)
def test_ct83_banco_recusa_insert_direto_com_espaco(db, codigo):
    """RN-04 também no banco: um INSERT fora da API com espaço no código é recusado pela CHECK."""
    with pytest.raises(IntegrityError) as erro:
        with db.begin_nested():
            inserir_direto(db, codigo)
    assert migracao.RESTRICAO in str(erro.value)
    # O mesmo código sem espaço entra
    inserir_direto(db, "30373543")


def test_ct83_banco_recusa_os_mesmos_espacos_que_a_api_tira(db):
    """A CHECK e a API (str.split) concordam em todo caractere do plano básico do Unicode."""
    caracteres = [chr(c) for c in range(1, 0x10000) if not 0xD800 <= c <= 0xDFFF]
    padrao = migracao.CONDICAO.split("!~ ", 1)[1].strip("'")
    recusados = db.execute(
        text("SELECT c FROM unnest(CAST(:caracteres AS text[])) AS c WHERE c ~ :padrao"),
        {"caracteres": caracteres, "padrao": padrao},
    ).scalars().all()
    assert set(recusados) == {c for c in caracteres if c.isspace()}
    # Fora do plano básico não há espaço em branco para o Python, então nada fica de fora da CHECK
    assert not any(chr(c).isspace() for c in range(0x10000, sys.maxunicode + 1))
