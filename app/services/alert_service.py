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

    alerts_changed = []

    today = date.today()
    expiration_limit = today + timedelta(
        days=expiration_lead_days
    )

    # Buscar produtos ativos
    result = await db.execute(
        select(Product).where(
            Product.active.is_(True)
        )
    )

    products = list(result.scalars().all())

    for product in products:

        # Buscar todos os lotes do produto
        result = await db.execute(
            select(Lot).where(
                Lot.product_id == product.id
            )
        )

        lots = list(result.scalars().all())

        # =========================================================
        # ALERTA DE ESTOQUE BAIXO
        # =========================================================

        total_stock = sum(
            lot.quantity
            for lot in lots
            if lot.quantity > 0
        )

        result = await db.execute(
            select(Alert).where(
                Alert.product_id == product.id,
                Alert.lot_id.is_(None),
                Alert.alert_type == "estoque_baixo",
            )
        )

        low_stock_alert = result.scalar_one_or_none()

        if total_stock <= product.minimum_stock:

            if low_stock_alert is None:

                alert = Alert(
                    product_id=product.id,
                    lot_id=None,
                    alert_type="estoque_baixo",
                    active=True,
                )

                db.add(alert)
                alerts_changed.append(alert)

            elif not low_stock_alert.active:

                low_stock_alert.active = True
                alerts_changed.append(low_stock_alert)

        else:

            if (
                low_stock_alert is not None
                and low_stock_alert.active
            ):
                low_stock_alert.active = False

        # =========================================================
        # ALERTAS DE VALIDADE
        # =========================================================

        for lot in lots:

            # Buscar alerta de próximo vencimento
            result = await db.execute(
                select(Alert).where(
                    Alert.product_id == product.id,
                    Alert.lot_id == lot.id,
                    Alert.alert_type == "proximo_vencimento",
                )
            )

            near_expiration_alert = (
                result.scalar_one_or_none()
            )

            # Buscar alerta de vencido
            result = await db.execute(
                select(Alert).where(
                    Alert.product_id == product.id,
                    Alert.lot_id == lot.id,
                    Alert.alert_type == "vencido",
                )
            )

            expired_alert = (
                result.scalar_one_or_none()
            )

            # Lote sem estoque não deve gerar alerta ativo
            if lot.quantity <= 0:

                if (
                    near_expiration_alert is not None
                    and near_expiration_alert.active
                ):
                    near_expiration_alert.active = False

                if (
                    expired_alert is not None
                    and expired_alert.active
                ):
                    expired_alert.active = False

                continue

            # Lote sem validade
            if lot.expiration_date is None:

                if (
                    near_expiration_alert is not None
                    and near_expiration_alert.active
                ):
                    near_expiration_alert.active = False

                if (
                    expired_alert is not None
                    and expired_alert.active
                ):
                    expired_alert.active = False

                continue

            # =====================================================
            # LOTE VENCIDO
            # =====================================================

            if lot.expiration_date < today:

                # Desativar possível alerta de próximo vencimento
                if (
                    near_expiration_alert is not None
                    and near_expiration_alert.active
                ):
                    near_expiration_alert.active = False

                if expired_alert is None:

                    alert = Alert(
                        product_id=product.id,
                        lot_id=lot.id,
                        alert_type="vencido",
                        active=True,
                    )

                    db.add(alert)
                    alerts_changed.append(alert)

                elif not expired_alert.active:

                    expired_alert.active = True
                    alerts_changed.append(expired_alert)

            # =====================================================
            # PRÓXIMO DO VENCIMENTO
            # =====================================================

            elif lot.expiration_date <= expiration_limit:

                # Desativar possível alerta de vencido
                if (
                    expired_alert is not None
                    and expired_alert.active
                ):
                    expired_alert.active = False

                if near_expiration_alert is None:

                    alert = Alert(
                        product_id=product.id,
                        lot_id=lot.id,
                        alert_type="proximo_vencimento",
                        active=True,
                    )

                    db.add(alert)
                    alerts_changed.append(alert)

                elif not near_expiration_alert.active:

                    near_expiration_alert.active = True
                    alerts_changed.append(
                        near_expiration_alert
                    )

            # =====================================================
            # LOTE FORA DA JANELA DE ALERTA
            # =====================================================

            else:

                if (
                    near_expiration_alert is not None
                    and near_expiration_alert.active
                ):
                    near_expiration_alert.active = False

                if (
                    expired_alert is not None
                    and expired_alert.active
                ):
                    expired_alert.active = False

    await db.commit()

    for alert in alerts_changed:
        await db.refresh(alert)

    return alerts_changed
    