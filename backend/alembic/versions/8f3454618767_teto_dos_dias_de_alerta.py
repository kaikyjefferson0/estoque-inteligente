"""teto dos dias de alerta

RN-26: products ganha a CHECK que limita dias_alerta_validade a 3650 dias (10 anos). Antes de criá-la,
confere se algum produto já passa do teto; se passar, para com a lista, sem corrigir nada sozinha.

Revision ID: 8f3454618767
Revises: 30a97c4f4643
Create Date: 2026-11-23 23:21:23.754879

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine import Connection


# revision identifiers, used by Alembic.
revision: str = '8f3454618767'
down_revision: Union[str, Sequence[str], None] = '30a97c4f4643'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


RESTRICAO = "ck_products_dias_alerta_validade_maximo"
# Cópia de app.schemas.products.DIAS_ALERTA_MAXIMO, de propósito: a migration não pode mudar de
# comportamento se o código da aplicação mudar depois
MAXIMO = 3650
# A mensagem de erro lista só os primeiros produtos; o total vai junto
PRODUTOS_NA_MENSAGEM = 20


class DiasDeAlertaAcimaDoTetoError(RuntimeError):
    """Há produto com mais de 3650 dias de alerta (RN-26): nada foi alterado."""


def conferir_produtos(conexao: Connection) -> None:
    produtos = conexao.execute(
        sa.text("SELECT id, nome, dias_alerta_validade AS dias FROM products WHERE dias_alerta_validade > :maximo ORDER BY id"),
        {"maximo": MAXIMO},
    ).all()
    if not produtos:
        return
    # !r: uma quebra de linha ou outro caractere de controle no nome não forja linhas no log do deploy
    lista = [f"produto {p.id} {p.nome!r}: {p.dias} dias" for p in produtos[:PRODUTOS_NA_MENSAGEM]]
    if len(produtos) > PRODUTOS_NA_MENSAGEM:
        lista.append(f"e mais {len(produtos) - PRODUTOS_NA_MENSAGEM}")
    raise DiasDeAlertaAcimaDoTetoError(
        f"Migration {revision} recusada (RN-26): {len(produtos)} produto(s) com mais de {MAXIMO} dias de alerta. "
        f"Nada foi alterado. Corrija os dias para {MAXIMO} ou menos e rode de novo.\n- " + "\n- ".join(lista)
    )


def upgrade() -> None:
    """Upgrade schema."""
    # No deploy a versão antiga da API ainda atende: se houver uma transação aberta na tabela, desiste
    # em 5 s (o deploy falha e pode ser repetido) em vez de ficar na fila e parar toda leitura de
    # produtos atrás dela. Vale só nesta transação.
    op.execute("SET LOCAL lock_timeout = '5s'")
    # A mesma trava que a CHECK pegaria, só que antes da conferência: nenhum produto muda entre as duas
    op.execute("LOCK TABLE products IN ACCESS EXCLUSIVE MODE")
    conferir_produtos(op.get_bind())
    op.create_check_constraint(RESTRICAO, "products", f"dias_alerta_validade <= {MAXIMO}")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(RESTRICAO, "products", type_="check")
