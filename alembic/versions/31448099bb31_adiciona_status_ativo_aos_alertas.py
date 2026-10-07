"""adiciona status ativo aos alertas

Revision ID: 31448099bb31
Revises: 50d7df1c4731
Create Date: 2026-10-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "31448099bb31"
down_revision: Union[str, Sequence[str], None] = "50d7df1c4731"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "alertas",
        sa.Column(
            "active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column(
        "alertas",
        "active",
    )
