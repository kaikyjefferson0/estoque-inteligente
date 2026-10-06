from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Supplier(Base):
    __tablename__ = "fornecedores"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    cnpj: Mapped[str | None] = mapped_column(
        String(18),
        nullable=True,
    )
    