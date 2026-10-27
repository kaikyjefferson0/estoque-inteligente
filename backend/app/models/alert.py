from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

TIPOS_ALERTA = ("estoque_baixo", "vencimento_proximo", "vencido")


class Alert(Base):
    """RN-39: alerta nunca é apagado; quando a condição acaba, ganha resolvido_em."""

    __tablename__ = "alerts"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('estoque_baixo', 'vencimento_proximo', 'vencido')", name="ck_alerts_tipo"
        ),
        # Estoque baixo é do produto (sem lote); os alertas de validade são de um lote
        CheckConstraint(
            "(tipo = 'estoque_baixo' AND lote_id IS NULL) OR (tipo <> 'estoque_baixo' AND lote_id IS NOT NULL)",
            name="ck_alerts_lote_por_tipo",
        ),
        # O lote precisa existir e ser do mesmo produto do alerta; nada é apagado, então RESTRICT
        ForeignKeyConstraint(
            ["lote_id", "produto_id"],
            ["batches.id", "batches.produto_id"],
            name="fk_alerts_lote_id_produto_id_batches",
            ondelete="RESTRICT",
        ),
        # RN-16/RN-39: um só alerta ativo por tipo + produto + lote. Parcial: os resolvidos
        # ficam fora, então a mesma condição pode voltar como alerta novo. NULLS NOT DISTINCT
        # faz o estoque_baixo (lote nulo) também ser único
        Index(
            "uq_alerts_ativo_tipo_produto_id_lote_id",
            "tipo",
            "produto_id",
            "lote_id",
            unique=True,
            postgresql_nulls_not_distinct=True,
            postgresql_where=text("resolvido_em IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(String(20))
    produto_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT", name="fk_alerts_produto_id_products"),
        index=True,
    )
    lote_id: Mapped[int | None] = mapped_column()
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolvido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
