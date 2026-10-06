from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Product(Base):
    __tablename__ = "produtos"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    barcode: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categorias.id"),
        nullable=True,
    )

    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("fornecedores.id"),
        nullable=True,
    )

    minimum_stock: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )

    controls_expiration: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    
    