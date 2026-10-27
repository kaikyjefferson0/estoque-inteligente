from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Batch(Base):
    __tablename__ = "batches"
    __table_args__ = (
        CheckConstraint("quantidade >= 0", name="ck_batches_quantidade_nao_negativa"),
        # RN-27/RN-28: um lote por produto + validade; NULLS NOT DISTINCT faz o lote
        # sem validade também ser único (no PostgreSQL, sem isso vários NULL passariam)
        UniqueConstraint(
            "produto_id",
            "validade",
            name="uq_batches_produto_id_validade",
            postgresql_nulls_not_distinct=True,
        ),
        # Alvo da FK composta de stock_movements (lote_id, produto_id): garante
        # que o lote da movimentação é do mesmo produto dela
        UniqueConstraint("id", "produto_id", name="uq_batches_id_produto_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # RN-23: produto nunca é apagado, então RESTRICT
    produto_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT", name="fk_batches_produto_id_products"),
    )
    # RN-08: só produto que controla validade tem lote com data
    validade: Mapped[date | None] = mapped_column(Date)
    quantidade: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
