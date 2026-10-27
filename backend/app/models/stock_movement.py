from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StockMovement(Base):
    """RN-12: histórico imutável; o service só insere, nunca altera nem apaga."""

    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("tipo IN ('entrada', 'saida', 'ajuste')", name="ck_stock_movements_tipo"),
        # RN-07: quantidade maior que zero
        CheckConstraint("quantidade > 0", name="ck_stock_movements_quantidade_positiva"),
        # RN-11: ajuste exige motivo (não vazio)
        CheckConstraint(
            "tipo <> 'ajuste' OR (motivo IS NOT NULL AND btrim(motivo) <> '')",
            name="ck_stock_movements_motivo_ajuste",
        ),
        # O lote precisa existir e ser do mesmo produto da movimentação
        ForeignKeyConstraint(
            ["lote_id", "produto_id"],
            ["batches.id", "batches.produto_id"],
            name="fk_stock_movements_lote_id_produto_id_batches",
            ondelete="RESTRICT",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    produto_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT", name="fk_stock_movements_produto_id_products"),
        index=True,
    )
    lote_id: Mapped[int] = mapped_column(index=True)
    tipo: Mapped[str] = mapped_column(String(20))
    quantidade: Mapped[int] = mapped_column(Integer)
    motivo: Mapped[str | None] = mapped_column(String(255))
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_stock_movements_usuario_id_users"),
        index=True,
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
