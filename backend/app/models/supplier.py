from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"
    __table_args__ = (
        # RN-25: CNPJ, quando informado, tem 14 dígitos (só números)
        CheckConstraint("cnpj ~ '^[0-9]{14}$'", name="ck_suppliers_cnpj_14_digitos"),
        # RN-25: único quando informado (no PostgreSQL, vários NULL não violam o UNIQUE)
        UniqueConstraint("cnpj", name="uq_suppliers_cnpj"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # RN-06: só o nome é obrigatório
    nome: Mapped[str] = mapped_column(String(120))
    cnpj: Mapped[str | None] = mapped_column(String(14))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
