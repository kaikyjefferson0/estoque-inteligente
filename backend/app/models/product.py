from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, false, func, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.core.database import Base
from app.models.supplier import Supplier


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
        # RN-26: no máximo 3650 dias (10 anos). NULL passa (produto que não controla validade)
        CheckConstraint("dias_alerta_validade <= 3650", name="ck_products_dias_alerta_validade_maximo"),
        # RN-04: sem espaço em branco (os mesmos caracteres que a API tira). Criada pela migration
        # 9a0c1c19b39f, que tem a cópia desta condição: as duas precisam ser iguais.
        CheckConstraint(
            r"codigo_barras !~ '[\u0009-\u000d\u001c- \u0085   - "
            r"    　]'",
            name="ck_products_codigo_barras_sem_espacos",
        ),
        # RN-60: preço opcional e nunca negativo
        CheckConstraint("preco >= 0", name="ck_products_preco_nao_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    # RN-04: código de barras único
    codigo_barras: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    # RN-05: estoque mínimo, controle de validade e dias de antecedência do alerta
    estoque_minimo: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    controla_validade: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    dias_alerta_validade: Mapped[int | None] = mapped_column(Integer)
    # RN-24: fornecedor opcional, mas precisa existir. RN-59: RESTRICT, o banco recusa excluir
    # fornecedor que ainda tem produto (a API transforma a recusa em 409)
    fornecedor_id: Mapped[int | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT", name="fk_products_fornecedor_id_suppliers"),
        index=True,
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # RN-60: preço em NUMERIC (valor exato, nunca float), até 99.999.999,99; vazio = sem preço
    preco: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    # Só leitura (não é coluna): nome do fornecedor, para as telas não buscarem a lista de fornecedores
    fornecedor_nome: Mapped[str | None] = column_property(
        select(Supplier.nome).where(Supplier.id == fornecedor_id).correlate_except(Supplier).scalar_subquery()
    )
