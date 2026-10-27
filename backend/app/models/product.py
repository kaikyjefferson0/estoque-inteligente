from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("estoque_minimo >= 0", name="ck_products_estoque_minimo_nao_negativo"),
        # RN-26: controla validade -> dias de alerta obrigatórios e > 0; senão, vazios
        CheckConstraint(
            "(controla_validade AND dias_alerta_validade IS NOT NULL AND dias_alerta_validade > 0)"
            " OR (NOT controla_validade AND dias_alerta_validade IS NULL)",
            name="ck_products_dias_alerta_validade",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    # RN-04: código de barras único
    codigo_barras: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    # RN-05: estoque mínimo, controle de validade e dias de antecedência do alerta
    estoque_minimo: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    controla_validade: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    dias_alerta_validade: Mapped[int | None] = mapped_column(Integer)
    # RN-24: fornecedor opcional, mas precisa existir; RN-23: nada é apagado, então RESTRICT
    fornecedor_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT", name="fk_products_fornecedor_id_suppliers"),
        index=True,
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
