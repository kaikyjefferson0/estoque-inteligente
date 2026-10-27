"""ajuste com saldos e historico imutavel

Revision ID: 8b6569e6e529
Revises: 2a9392eda790
Create Date: 2026-10-27 00:04:04.026807

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b6569e6e529'
down_revision: Union[str, Sequence[str], None] = '2a9392eda790'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # RN-34: o ajuste guarda o saldo anterior e o saldo novo do lote
    op.add_column('stock_movements', sa.Column('saldo_anterior', sa.Integer(), nullable=True))
    op.add_column('stock_movements', sa.Column('saldo_novo', sa.Integer(), nullable=True))

    # RN-07 e RN-33: entrada e saída > 0; ajuste é a diferença, diferente de zero
    # (o autogenerate não detecta CHECK constraints, por isso estão à mão)
    op.drop_constraint('ck_stock_movements_quantidade_positiva', 'stock_movements', type_='check')
    op.create_check_constraint(
        'ck_stock_movements_quantidade',
        'stock_movements',
        "(tipo = 'ajuste' AND quantidade <> 0) OR (tipo <> 'ajuste' AND quantidade > 0)",
    )
    # RN-34/RN-35: no ajuste, saldos obrigatórios, não negativos e coerentes com a diferença
    op.create_check_constraint(
        'ck_stock_movements_saldos_ajuste',
        'stock_movements',
        "tipo <> 'ajuste' OR (saldo_anterior IS NOT NULL AND saldo_novo IS NOT NULL"
        " AND saldo_anterior >= 0 AND saldo_novo >= 0 AND saldo_novo - saldo_anterior = quantidade)",
    )

    # RN-12: o banco recusa UPDATE e DELETE, mesmo fora da API
    # (mesmo SQL de app\models\stock_movement.py; a migration não importa o model
    # para não mudar se o model mudar depois)
    op.execute(
        """
        CREATE OR REPLACE FUNCTION stock_movements_imutavel() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'stock_movements é imutável (RN-12): % não é permitido', TG_OP
                USING HINT = 'Para corrigir o estoque, registre um ajuste.';
        END;
        $$
        """
    )
    op.execute(
        "CREATE TRIGGER trg_stock_movements_imutavel BEFORE UPDATE OR DELETE ON stock_movements"
        " FOR EACH STATEMENT EXECUTE FUNCTION stock_movements_imutavel()"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TRIGGER IF EXISTS trg_stock_movements_imutavel ON stock_movements")
    op.execute("DROP FUNCTION IF EXISTS stock_movements_imutavel()")

    op.drop_constraint('ck_stock_movements_saldos_ajuste', 'stock_movements', type_='check')
    op.drop_constraint('ck_stock_movements_quantidade', 'stock_movements', type_='check')
    # Se já existir ajuste com quantidade negativa, esta linha falha de propósito:
    # o downgrade não apaga histórico (RN-12) para conseguir voltar
    op.create_check_constraint('ck_stock_movements_quantidade_positiva', 'stock_movements', 'quantidade > 0')

    op.drop_column('stock_movements', 'saldo_novo')
    op.drop_column('stock_movements', 'saldo_anterior')
