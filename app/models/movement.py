from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Movement(Base):
    __tablename__ = "movimentacoes"

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

    user_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id"),
        nullable=False,
        index=True,
    )

    movement_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    



    