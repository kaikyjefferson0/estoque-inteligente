import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_alerta_de_estoque_baixo():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:

        # Login do administrador
        login_response = await client.post(
            "/auth/login",
            json={
                "email": "admin@estoque.com",
                "password": "kaiky04261314",
            },
        )

        assert login_response.status_code == 200

        token = login_response.json()["access_token"]

        headers = {
            "Authorization": f"Bearer {token}",
        }

        # =========================================================
        # PRODUTO
        # =========================================================

        products_response = await client.get(
            "/products/",
        )

        assert products_response.status_code == 200

        products = products_response.json()

        product = next(
            (
                item
                for item in products
                if item["barcode"] == "PYTEST-CT16-001"
            ),
            None,
        )

        # Criar produto se ainda não existir
        if product is None:

            product_response = await client.post(
                "/products/",
                headers=headers,
                json={
                    "name": "Produto Teste CT-16",
                    "barcode": "PYTEST-CT16-001",
                    "minimum_stock": 10,
                    "controls_expiration": False,
                },
            )

            assert product_response.status_code == 201

            product = product_response.json()

        product_id = product["id"]

        assert product["minimum_stock"] == 10

        # =========================================================
        # LOTE
        # =========================================================

        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT16-001",
                "quantity": 5,
                "expiration_date": None,
            },
        )

        assert lot_response.status_code == 201

        lot = lot_response.json()

        assert lot["quantity"] == 5

        # =========================================================
        # GERAR ALERTAS
        # =========================================================

        generate_response = await client.post(
            "/alerts/generate",
        )

        assert generate_response.status_code == 200

        generated_alerts = generate_response.json()

        low_stock_alert = next(
            (
                alert
                for alert in generated_alerts
                if alert["product_id"] == product_id
                and alert["lot_id"] is None
                and alert["alert_type"] == "estoque_baixo"
                and alert["active"] is True
            ),
            None,
        )

        assert low_stock_alert is not None

        # =========================================================
        # CONSULTAR ALERTAS ATIVOS
        # =========================================================

        alerts_response = await client.get(
            "/alerts/",
        )

        assert alerts_response.status_code == 200

        alerts = alerts_response.json()

        active_low_stock_alert = next(
            (
                alert
                for alert in alerts
                if alert["product_id"] == product_id
                and alert["lot_id"] is None
                and alert["alert_type"] == "estoque_baixo"
                and alert["active"] is True
            ),
            None,
        )

        assert active_low_stock_alert is not None

        assert (
            active_low_stock_alert["id"]
            == low_stock_alert["id"]
        )


@pytest.mark.asyncio
async def test_alerta_de_proximo_vencimento():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:

        # Login do administrador
        login_response = await client.post(
            "/auth/login",
            json={
                "email": "admin@estoque.com",
                "password": "kaiky04261314",
            },
        )

        assert login_response.status_code == 200

        token = login_response.json()["access_token"]

        headers = {
            "Authorization": f"Bearer {token}",
        }

        # =========================================================
        # PRODUTO
        # =========================================================

        products_response = await client.get(
            "/products/",
        )

        assert products_response.status_code == 200

        products = products_response.json()

        product = next(
            (
                item
                for item in products
                if item["barcode"] == "PYTEST-CT17-001"
            ),
            None,
        )

        # Criar produto se ainda não existir
        if product is None:

            product_response = await client.post(
                "/products/",
                headers=headers,
                json={
                    "name": "Produto Teste CT-17",
                    "barcode": "PYTEST-CT17-001",
                    "minimum_stock": 0,
                    "controls_expiration": True,
                },
            )

            assert product_response.status_code == 201

            product = product_response.json()

        product_id = product["id"]

        assert product["controls_expiration"] is True

        # =========================================================
        # LOTE PRÓXIMO DO VENCIMENTO
        # =========================================================
        #
        # A data está dentro da janela de 30 dias.
        # Portanto, deve gerar "proximo_vencimento".
        #

        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT17-001",
                "quantity": 10,
                "expiration_date": "2026-10-20",
            },
        )

        assert lot_response.status_code == 201

        lot = lot_response.json()

        lot_id = lot["id"]

        assert lot["quantity"] == 10

        assert lot["expiration_date"] == "2026-10-20"

        # =========================================================
        # GERAR ALERTAS
        # =========================================================

        generate_response = await client.post(
            "/alerts/generate",
        )

        assert generate_response.status_code == 200

        generated_alerts = generate_response.json()

        # Procurar o alerta do lote
        near_expiration_alert = next(
            (
                alert
                for alert in generated_alerts
                if alert["product_id"] == product_id
                and alert["lot_id"] == lot_id
                and alert["alert_type"] == "proximo_vencimento"
                and alert["active"] is True
            ),
            None,
        )

        assert near_expiration_alert is not None

        # =========================================================
        # CONSULTAR ALERTAS ATIVOS
        # =========================================================

        alerts_response = await client.get(
            "/alerts/",
        )

        assert alerts_response.status_code == 200

        alerts = alerts_response.json()

        active_near_expiration_alert = next(
            (
                alert
                for alert in alerts
                if alert["product_id"] == product_id
                and alert["lot_id"] == lot_id
                and alert["alert_type"] == "proximo_vencimento"
                and alert["active"] is True
            ),
            None,
        )

        assert active_near_expiration_alert is not None

        assert (
            active_near_expiration_alert["id"]
            == near_expiration_alert["id"]
        )
        

