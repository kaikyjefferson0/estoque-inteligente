from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movement import Movement
from app.models.product import Product
from app.models.lot import Lot
from app.schemas.movement import MovementCreate


async def create_movement(
    db: AsyncSession,
    data: MovementCreate,
    user_id: int,
) -> Movement:

    # BUSCAR PRODUTO
    if data.barcode:
        result = await db.execute(
            select(Product).where(Product.barcode == data.barcode)
        )

        product = result.scalar_one_or_none()

        if product is None:
            raise ValueError(
                "Produto não encontrado pelo código de barras."
            )

    else:
        product = await db.get(
            Product,
            data.product_id,
        )

        if product is None:
            raise ValueError("Produto não encontrado.")

    # VALIDAR TIPO DE MOVIMENTAÇÃO
    if data.movement_type not in {
        "entrada",
        "saida",
        "ajuste",
    }:
        raise ValueError(
            "Tipo de movimentação inválido."
        )

    # VALIDAR QUANTIDADE
    if data.quantity < 0:
        raise ValueError(
            "A quantidade não pode ser negativa."
        )

    if (
        data.movement_type in {"entrada", "saida"}
        and data.quantity == 0
    ):
        raise ValueError(
            "A quantidade deve ser maior que zero."
        )

    # ENTRADA
    if data.movement_type == "entrada":

        if data.lot_id is None:
            raise ValueError(
                "Entrada de estoque precisa informar um lote."
            )

        lot = await db.get(
            Lot,
            data.lot_id,
        )

        if lot is None:
            raise ValueError(
                "Lote não encontrado."
            )

        if lot.product_id != product.id:
            raise ValueError(
                "O lote não pertence ao produto informado."
            )

        lot.quantity += data.quantity

        movement = Movement(
            product_id=product.id,
            lot_id=lot.id,
            user_id=user_id,
            movement_type="entrada",
            quantity=data.quantity,
            reason=data.reason,
        )

        db.add(movement)

        await db.commit()
        await db.refresh(movement)

        return movement

    # SAÍDA — FEFO
    if data.movement_type == "saida":

        remaining_quantity = data.quantity
        first_movement = None

        result = await db.execute(
            select(Lot)
            .where(
                Lot.product_id == product.id,
                Lot.quantity > 0,
            )
            .order_by(
                Lot.expiration_date.asc().nulls_last(),
                Lot.created_at.asc(),
                Lot.id.asc(),
            )
            .with_for_update()
        )

        lots = list(
            result.scalars().all()
        )

        total_stock = sum(
            lot.quantity
            for lot in lots
        )

        if total_stock < data.quantity:
            raise ValueError(
                "Estoque insuficiente."
            )

        for lot in lots:

            if remaining_quantity == 0:
                break

            quantity_from_lot = min(
                lot.quantity,
                remaining_quantity,
            )

            lot.quantity -= quantity_from_lot
            remaining_quantity -= quantity_from_lot

            movement = Movement(
                product_id=product.id,
                lot_id=lot.id,
                user_id=user_id,
                movement_type="saida",
                quantity=quantity_from_lot,
                reason=data.reason,
            )

            db.add(movement)

            if first_movement is None:
                first_movement = movement

        await db.commit()
        await db.refresh(first_movement)

        return first_movement

    # AJUSTE
    if data.movement_type == "ajuste":

        if data.lot_id is None:
            raise ValueError(
                "Ajuste de estoque precisa informar um lote."
            )

        if not data.reason or not data.reason.strip():
            raise ValueError(
                "Ajuste de estoque precisa informar um motivo."
            )

        lot = await db.get(
            Lot,
            data.lot_id,
        )

        if lot is None:
            raise ValueError(
                "Lote não encontrado."
            )

        if lot.product_id != product.id:
            raise ValueError(
                "O lote não pertence ao produto informado."
            )

        lot.quantity = data.quantity

        movement = Movement(
            product_id=product.id,
            lot_id=lot.id,
            user_id=user_id,
            movement_type="ajuste",
            quantity=data.quantity,
            reason=data.reason,
        )

        db.add(movement)

        await db.commit()
        await db.refresh(movement)

        return movement


async def list_movements(
    db: AsyncSession,
) -> list[Movement]:

    result = await db.execute(
        select(Movement).order_by(
            Movement.id
        )
    )

    return list(
        result.scalars().all()
    )
    
    
    

    
        
    
    