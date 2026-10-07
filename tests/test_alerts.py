import uuid

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

        # Criamos um código novo a cada execução
        unique_code = (
            f"PYTEST-CT16-{uuid.uuid4().hex[:8]}"
        )

        product_response = await client.post(
            "/products/",
            headers=headers,
            json={
                "name": "Produto Teste CT-16",
                "barcode": unique_code,
                "minimum_stock": 10,
                "controls_expiration": False,
            },
        )

        assert product_response.status_code == 201

        product = product_response.json()

        product_id = product["id"]

        assert product["minimum_stock"] == 10

        # =========================================================
        # CRIAR LOTE COM ESTOQUE ABAIXO DO MÍNIMO
        # =========================================================

        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": unique_code,
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

        # =========================================================
        # CONSULTAR ALERTAS
        # =========================================================

        alerts_response = await client.get(
            "/alerts/",
        )

        assert alerts_response.status_code == 200

        alerts = alerts_response.json()

        low_stock_alert = next(
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

        assert low_stock_alert is not None


@pytest.mark.asyncio
async def test_alerta_de_proximo_vencimento():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:

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

        product_response = await client.post(
            "/products/",
            headers=headers,
            json={
                "name": "Produto Teste CT-17",
                "barcode": "PYTEST-CT17-002",
                "minimum_stock": 0,
                "controls_expiration": True,
            },
        )

        if product_response.status_code == 409:

            products_response = await client.get(
                "/products/",
            )

            assert products_response.status_code == 200

            products = products_response.json()

            product = next(
                (
                    item
                    for item in products
                    if item["barcode"] == "PYTEST-CT17-002"
                ),
                None,
            )

            assert product is not None

        else:

            assert product_response.status_code == 201

            product = product_response.json()

        product_id = product["id"]

        assert product["controls_expiration"] is True

        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT17-002",
                "quantity": 10,
                "expiration_date": "2026-10-20",
            },
        )

        assert lot_response.status_code == 201

        lot = lot_response.json()

        lot_id = lot["id"]

        assert lot["quantity"] == 10

        assert lot["expiration_date"] == "2026-10-20"

        generate_response = await client.post(
            "/alerts/generate",
        )

        assert generate_response.status_code == 200

        alerts_response = await client.get(
            "/alerts/",
        )

        assert alerts_response.status_code == 200

        alerts = alerts_response.json()

        near_expiration_alert = next(
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

        assert near_expiration_alert is not None


@pytest.mark.asyncio
async def test_alerta_de_lote_vencido():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:

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

        product_response = await client.post(
            "/products/",
            headers=headers,
            json={
                "name": "Produto Teste CT-18",
                "barcode": "PYTEST-CT18-001",
                "minimum_stock": 0,
                "controls_expiration": True,
            },
        )

        if product_response.status_code == 409:

            products_response = await client.get(
                "/products/",
            )

            assert products_response.status_code == 200

            products = products_response.json()

            product = next(
                (
                    item
                    for item in products
                    if item["barcode"] == "PYTEST-CT18-001"
                ),
                None,
            )

            assert product is not None

        else:

            assert product_response.status_code == 201

            product = product_response.json()

        product_id = product["id"]

        assert product["controls_expiration"] is True

        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT18-001",
                "quantity": 10,
                "expiration_date": "2026-01-01",
            },
        )

        assert lot_response.status_code == 201

        lot = lot_response.json()

        lot_id = lot["id"]

        assert lot["quantity"] == 10

        assert lot["expiration_date"] == "2026-01-01"

        generate_response = await client.post(
            "/alerts/generate",
        )

        assert generate_response.status_code == 200

        alerts_response = await client.get(
            "/alerts/",
        )

        assert alerts_response.status_code == 200

        alerts = alerts_response.json()

        expired_alert = next(
            (
                alert
                for alert in alerts
                if alert["product_id"] == product_id
                and alert["lot_id"] == lot_id
                and alert["alert_type"] == "vencido"
                and alert["active"] is True
            ),
            None,
        )

        assert expired_alert is not None


@pytest.mark.asyncio
async def test_geracao_de_alertas_nao_cria_duplicados():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:

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

        product_response = await client.post(
            "/products/",
            headers=headers,
            json={
                "name": "Produto Teste CT-19",
                "barcode": "PYTEST-CT19-001",
                "minimum_stock": 0,
                "controls_expiration": True,
            },
        )

        if product_response.status_code == 409:

            products_response = await client.get(
                "/products/",
            )

            assert products_response.status_code == 200

            products = products_response.json()

            product = next(
                (
                    item
                    for item in products
                    if item["barcode"] == "PYTEST-CT19-001"
                ),
                None,
            )

            assert product is not None

        else:

            assert product_response.status_code == 201

            product = product_response.json()

        product_id = product["id"]

        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT19-001",
                "quantity": 10,
                "expiration_date": "2026-01-01",
            },
        )

        assert lot_response.status_code == 201

        lot = lot_response.json()

        lot_id = lot["id"]

        # =========================================================
        # PRIMEIRA GERAÇÃO
        # =========================================================

        first_generation = await client.post(
            "/alerts/generate",
        )

        assert first_generation.status_code == 200

        first_alerts = first_generation.json()

        first_matching_alerts = [
            alert
            for alert in first_alerts
            if alert["product_id"] == product_id
            and alert["lot_id"] == lot_id
            and alert["alert_type"] == "vencido"
            and alert["active"] is True
        ]

        assert len(first_matching_alerts) == 1

        first_alert_id = first_matching_alerts[0]["id"]

        # =========================================================
        # SEGUNDA GERAÇÃO
        # =========================================================

        second_generation = await client.post(
            "/alerts/generate",
        )

        assert second_generation.status_code == 200

        second_alerts = second_generation.json()

        second_matching_alerts = [
            alert
            for alert in second_alerts
            if alert["product_id"] == product_id
            and alert["lot_id"] == lot_id
            and alert["alert_type"] == "vencido"
            and alert["active"] is True
        ]

        assert len(second_matching_alerts) == 0

        # =========================================================
        # CONFIRMAR QUE EXISTE APENAS UM ALERTA ATIVO
        # =========================================================

        alerts_response = await client.get(
            "/alerts/",
        )

        assert alerts_response.status_code == 200

        active_alerts = alerts_response.json()

        matching_active_alerts = [
            alert
            for alert in active_alerts
            if alert["product_id"] == product_id
            and alert["lot_id"] == lot_id
            and alert["alert_type"] == "vencido"
            and alert["active"] is True
        ]

        assert len(matching_active_alerts) == 1

        assert matching_active_alerts[0]["id"] == first_alert_id
        


        




        




        

