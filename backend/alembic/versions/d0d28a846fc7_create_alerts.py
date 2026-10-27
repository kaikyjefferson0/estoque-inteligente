"""create alerts

Revision ID: d0d28a846fc7
Revises: 8b6569e6e529
Create Date: 2026-10-27 00:30:45.465791

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd0d28a846fc7'
down_revision: Union[str, Sequence[str], None] = '8b6569e6e529'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # RN-13 a RN-15 e RN-39: alertas ativos (resolvido_em nulo) e resolvidos, nunca apagados
    op.create_table('alerts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tipo', sa.String(length=20), nullable=False),
    sa.Column('produto_id', sa.Integer(), nullable=False),
    sa.Column('lote_id', sa.Integer(), nullable=True),
    sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('resolvido_em', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("(tipo = 'estoque_baixo' AND lote_id IS NULL) OR (tipo <> 'estoque_baixo' AND lote_id IS NOT NULL)", name='ck_alerts_lote_por_tipo'),
    sa.CheckConstraint("tipo IN ('estoque_baixo', 'vencimento_proximo', 'vencido')", name='ck_alerts_tipo'),
    sa.ForeignKeyConstraint(['lote_id', 'produto_id'], ['batches.id', 'batches.produto_id'], name='fk_alerts_lote_id_produto_id_batches', ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['produto_id'], ['products.id'], name='fk_alerts_produto_id_products', ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alerts_produto_id'), 'alerts', ['produto_id'], unique=False)
    # RN-16: um só alerta ativo por tipo + produto + lote; parcial (resolvidos ficam fora,
    # RN-39) e NULLS NOT DISTINCT para o estoque_baixo, que não tem lote
    op.create_index('uq_alerts_ativo_tipo_produto_id_lote_id', 'alerts', ['tipo', 'produto_id', 'lote_id'], unique=True, postgresql_nulls_not_distinct=True, postgresql_where=sa.text('resolvido_em IS NULL'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_alerts_ativo_tipo_produto_id_lote_id', table_name='alerts', postgresql_nulls_not_distinct=True, postgresql_where=sa.text('resolvido_em IS NULL'))
    op.drop_index(op.f('ix_alerts_produto_id'), table_name='alerts')
    op.drop_table('alerts')
