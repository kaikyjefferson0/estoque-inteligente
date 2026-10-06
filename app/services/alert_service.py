from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert
from app.models.lot import Lot
from app.models.product import Product


async def generate_alerts(
    db: AsyncSession,
    expiration_lead_days: int = 30,
) -> list[Alert]:

    alerts_created = []

    # Busca todos os produtos ativos
    result = await db.execute(
        select(Product).where(Product.active.is_(True))
    )

    products = list(result.scalars().all())

    for product in products:

        # =========================
        # ALERTA DE ESTOQUE BAIXO
        # =========================

        result = await db.execute(
            select(Lot).where(
                Lot.product_id == product.id,
                Lot.quantity > 0,
            )
        )

        lots = list(result.scalars().all())

        total_stock = sum(lot.quantity for lot in lots)

        if total_stock <= product.minimum_stock:

            existing_alert = await db.execute(
                select(Alert).where(
                    Alert.product_id == product.id,
                    Alert.lot_id.is_(None),
                    Alert.alert_type == "estoque_baixo",
                )
            )

            if existing_alert.scalar_one_or_none() is None:

                alert = Alert(
                    product_id=product.id,
                    lot_id=None,
                    alert_type="estoque_baixo",
                )

                db.add(alert)
                alerts_created.append(alert)

        # =========================
        # ALERTAS DE VALIDADE
        # =========================

        for lot in lots:

            if lot.expiration_date is None:
                continue

            today = date.today()
            expiration_limit = today + timedelta(
                days=expiration_lead_days
            )

            if lot.expiration_date < today:
                alert_type = "vencido"

            elif lot.expiration_date <= expiration_limit:
                alert_type = "proximo_vencimento"

            else:
                continue

            existing_alert = await db.execute(
                select(Alert).where(
                    Alert.product_id == product.id,
                    Alert.lot_id == lot.id,
                    Alert.alert_type == alert_type,
                )
            )

            if existing_alert.scalar_one_or_none() is None:

                alert = Alert(
                    product_id=product.id,
                    lot_id=lot.id,
                    alert_type=alert_type,
                )

                db.add(alert)
                alerts_created.append(alert)

    await db.commit()

    for alert in alerts_created:
        await db.refresh(alert)

    return alerts_created
    