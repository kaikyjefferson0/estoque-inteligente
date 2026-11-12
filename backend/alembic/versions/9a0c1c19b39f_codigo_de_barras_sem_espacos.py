"""codigo de barras sem espacos

RN-04: tira todo espaço em branco de products.codigo_barras (os produtos gravados antes de a API
passar a remover os espaços) e depois cria a CHECK que faz o banco recusar código com espaço.

Revision ID: 9a0c1c19b39f
Revises: 5213613b4aa4
Create Date: 2026-11-12 00:09:00.896275

"""
from collections import defaultdict
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import Connection


# revision identifiers, used by Alembic.
revision: str = '9a0c1c19b39f'
down_revision: Union[str, Sequence[str], None] = '5213613b4aa4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


RESTRICAO = "ck_products_codigo_barras_sem_espacos"
# Os mesmos caracteres que o str.split() do Python trata como espaço (a regra da API), escritos um a
# um. Não usa o \s do PostgreSQL de propósito: ele depende do locale do banco e, com o da glibc, não
# pega o espaço inseparável (U+00A0). Cópia em app.models.product: as duas precisam ser iguais.
CONDICAO = (
    r"codigo_barras !~ '[\u0009-\u000d\u001c- \u0085   - "
    r"    　]'"
)


class CodigosRepetidosError(RuntimeError):
    """A limpeza deixaria dois ou mais produtos com o mesmo código (RN-04): nada foi alterado."""


def _sem_espacos(codigo: str) -> str:
    # Mesma regra de app.schemas.products.normalizar_codigo_barras, copiada de propósito:
    # a migration não pode mudar de comportamento se o código da aplicação mudar depois
    return "".join(codigo.split())


def limpar_codigos_de_barras(conexao: Connection) -> int:
    """Confere tudo antes de alterar: se a limpeza gerar código repetido ou vazio, para com a
    lista dos produtos envolvidos, sem mudar nenhuma linha. Devolve quantos produtos mudaram."""
    produtos = conexao.execute(sa.text("SELECT id, nome, codigo_barras FROM products ORDER BY id")).all()

    por_codigo: dict[str, list] = defaultdict(list)
    for produto in produtos:
        por_codigo[_sem_espacos(produto.codigo_barras)].append(produto)

    problemas = []
    for codigo, grupo in por_codigo.items():
        descricao = ", ".join(f'produto {p.id} "{p.nome}" ({p.codigo_barras!r})' for p in grupo)
        if not codigo:
            problemas.append(f"código vazio sem os espaços: {descricao}")
        elif len(grupo) > 1:
            problemas.append(f"{codigo}: {descricao}")
    if problemas:
        raise CodigosRepetidosError(
            "Migration 9a0c1c19b39f recusada (RN-04): sem os espaços, estes produtos ficariam com o "
            "mesmo código de barras (ou sem código). Nada foi alterado. Corrija os códigos e rode de novo.\n- "
            + "\n- ".join(problemas)
        )

    # Sem repetição, nenhum código novo bate com outro já gravado: o índice único não reclama
    mudados = [p for p in produtos if _sem_espacos(p.codigo_barras) != p.codigo_barras]
    for produto in mudados:
        conexao.execute(
            sa.text("UPDATE products SET codigo_barras = :codigo WHERE id = :id"),
            {"codigo": _sem_espacos(produto.codigo_barras), "id": produto.id},
        )
    return len(mudados)


def criar_restricao(conexao: Connection) -> None:
    """RN-04 também no banco: código com espaço é recusado mesmo fora da API. Vem depois da limpeza,
    porque o PostgreSQL confere as linhas que já existem ao criar a CHECK."""
    conexao.execute(sa.text(f"ALTER TABLE products ADD CONSTRAINT {RESTRICAO} CHECK ({CONDICAO})"))


def upgrade() -> None:
    """Tira os espaços dos códigos de barras já gravados e cria a CHECK (RN-04)."""
    conexao = op.get_bind()
    limpar_codigos_de_barras(conexao)
    criar_restricao(conexao)


def downgrade() -> None:
    """Remove a CHECK. Os espaços não são restaurados, de propósito: a migration não guarda os
    códigos antigos, e eles não fazem falta. Com ou sem espaço, é o mesmo código, e a versão anterior
    da aplicação busca pelo texto exato, então o código limpo continua sendo encontrado por ela."""
    op.drop_constraint(RESTRICAO, "products", type_="check")
