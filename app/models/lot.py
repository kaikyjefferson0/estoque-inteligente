from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Lot(Base):
    __tablename__ = "lotes"

    id: Mapped[int] = mapped_column(primary_key=True)

    product_id: Mapped[int] = mapped_column(
        ForeignKey("produtos.id"),
        nullable=False,
        index=True,
    )

    lot_code: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    expiration_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    

    