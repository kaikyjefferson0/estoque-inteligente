from datetime import datetime

from sqlalchemy import DDL, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Integer, String, event, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StockMovement(Base):
    """RN-12: histórico imutável; o service só insere, nunca altera nem apaga."""

    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("tipo IN ('entrada', 'saida', 'ajuste')", name="ck_stock_movements_tipo"),
        # RN-07: entrada e saída com quantidade maior que zero.
        # RN-33: no ajuste, a quantidade é a diferença (pode ser negativa, nunca zero)
        CheckConstraint(
            "(tipo = 'ajuste' AND quantidade <> 0) OR (tipo <> 'ajuste' AND quantidade > 0)",
            name="ck_stock_movements_quantidade",
        ),
        # RN-34/RN-35: o ajuste guarda os saldos do lote, nunca negativos, coerentes com a diferença
        CheckConstraint(
            "tipo <> 'ajuste' OR (saldo_anterior IS NOT NULL AND saldo_novo IS NOT NULL"
            " AND saldo_anterior >= 0 AND saldo_novo >= 0 AND saldo_novo - saldo_anterior = quantidade)",
            name="ck_stock_movements_saldos_ajuste",
        ),
        # RN-11: ajuste exige motivo (não vazio)
        CheckConstraint(
            "tipo <> 'ajuste' OR (motivo IS NOT NULL AND btrim(motivo) <> '')",
            name="ck_stock_movements_motivo_ajuste",
        ),
        # O lote precisa existir e ser do mesmo produto da movimentação
        ForeignKeyConstraint(
            ["lote_id", "produto_id"],
            ["batches.id", "batches.produto_id"],
            name="fk_stock_movements_lote_id_produto_id_batches",
            ondelete="RESTRICT",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    produto_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="RESTRICT", name="fk_stock_movements_produto_id_products"),
        index=True,
    )
    lote_id: Mapped[int] = mapped_column(index=True)
    tipo: Mapped[str] = mapped_column(String(20))
    quantidade: Mapped[int] = mapped_column(Integer)
    motivo: Mapped[str | None] = mapped_column(String(255))
    saldo_anterior: Mapped[int | None] = mapped_column(Integer)
    saldo_novo: Mapped[int | None] = mapped_column(Integer)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_stock_movements_usuario_id_users"),
        index=True,
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# RN-12: o banco recusa UPDATE e DELETE, mesmo fora da API. A migration cria o mesmo
# trigger; aqui ele acompanha o create_all/drop_all usado nos testes.
# No DDL() o "%" é formatação do SQLAlchemy, por isso o "%%" do RAISE vira "%" no banco.
FUNCAO_IMUTAVEL = DDL(
    """
    CREATE OR REPLACE FUNCTION stock_movements_imutavel() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
        RAISE EXCEPTION 'stock_movements é imutável (RN-12): %% não é permitido', TG_OP
            USING HINT = 'Para corrigir o estoque, registre um ajuste.';
    END;
    $$
    """
)
TRIGGER_IMUTAVEL = DDL(
    "CREATE TRIGGER trg_stock_movements_imutavel BEFORE UPDATE OR DELETE ON stock_movements"
    " FOR EACH STATEMENT EXECUTE FUNCTION stock_movements_imutavel()"
)
event.listen(StockMovement.__table__, "after_create", FUNCAO_IMUTAVEL)
event.listen(StockMovement.__table__, "after_create", TRIGGER_IMUTAVEL)
# O DROP TABLE já leva o trigger junto; a função fica solta e precisa sair também
event.listen(StockMovement.__table__, "after_drop", DDL("DROP FUNCTION IF EXISTS stock_movements_imutavel()"))
