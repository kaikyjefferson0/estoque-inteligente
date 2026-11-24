"""preco do produto em numeric

RN-60: products ganha a coluna preco NUMERIC(10,2), opcional (NULL), e a CHECK que recusa preço
negativo. Só ADD COLUMN, sem UPDATE de preenchimento: os produtos já cadastrados (inclusive os do
Neon) ficam sem preço. Permissões: são dadas por tabela (core/permissoes.py, RN-58), então a coluna
nova não muda nada para o usuário da aplicação.

Atenção: o downgrade apaga a coluna e, com ela, todos os preços gravados. Não há como recuperá-los
depois; num banco com dados reais (Neon), faça um backup antes de descer desta revisão.

Revision ID: 30a97c4f4643
Revises: 9a0c1c19b39f
Create Date: 2026-11-23 21:27:41.106923

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '30a97c4f4643'
down_revision: Union[str, Sequence[str], None] = '9a0c1c19b39f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COLUNA = "preco"
RESTRICAO = "ck_products_preco_nao_negativo"


def upgrade() -> None:
    """Upgrade schema."""
    # A CHECK pega trava ACCESS EXCLUSIVE em products. No deploy a versão antiga da API ainda atende:
    # se houver uma transação aberta na tabela, desiste em 5 s (o deploy falha e pode ser repetido)
    # em vez de ficar na fila e parar toda leitura de produtos atrás dela. Vale só nesta transação.
    op.execute("SET LOCAL lock_timeout = '5s'")
    # Coluna nula e sem default: o ADD COLUMN não reescreve a tabela nem confere linha nenhuma
    op.add_column("products", sa.Column(COLUNA, sa.Numeric(10, 2), nullable=True))
    # A CHECK lê a tabela inteira (pequena) para conferir as linhas. Todas têm preço NULL, que passa
    # (o resultado é desconhecido, não falso): sem preço continua valendo
    op.create_check_constraint(RESTRICAO, "products", "preco >= 0")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(RESTRICAO, "products", type_="check")
    op.drop_column("products", COLUNA)
