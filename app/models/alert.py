from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Alert(Base):
    __tablename__ = "alertas"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("produtos.id"),
        nullable=False,
        index=True,
    )

    lot_id: Mapped[int | None] = mapped_column(
        ForeignKey("lotes.id"),
        nullable=True,
        index=True,
    )

    alert_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "lot_id",
            "alert_type",
            name="uq_alerta_produto_lote_tipo",
        ),
    )



    
    
    