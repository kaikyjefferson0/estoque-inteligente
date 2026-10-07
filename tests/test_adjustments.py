import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_admin_pode_ajustar_estoque_com_motivo():
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

        # Procurar o produto de teste
        products_response = await client.get(
            "/products/",
        )

        assert products_response.status_code == 200

        products = products_response.json()

        product = next(
            (
                item
                for item in products
                if item["barcode"] == "PYTEST-CT13-001"
            ),
            None,
        )

        # Se ainda não existir, criar o produto
        if product is None:

            product_response = await client.post(
                "/products/",
                headers=headers,
                json={
                    "name": "Produto Teste CT-13",
                    "barcode": "PYTEST-CT13-001",
                    "minimum_stock": 0,
                    "controls_expiration": False,
                },
            )

            assert product_response.status_code == 201

            product = product_response.json()

        product_id = product["id"]

        # Criar lote com 10 unidades
        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT13-001",
                "quantity": 10,
                "expiration_date": None,
            },
        )

        assert lot_response.status_code == 201

        lot = lot_response.json()

        lot_id = lot["id"]

        assert lot["quantity"] == 10

        # Ajustar o estoque de 10 para 15 unidades
        adjustment_response = await client.post(
            "/movements/",
            headers=headers,
            json={
                "barcode": "PYTEST-CT13-001",
                "lot_id": lot_id,
                "movement_type": "ajuste",
                "quantity": 15,
                "reason": "Correção de inventário CT-13",
            },
        )

        assert adjustment_response.status_code == 201

        movement = adjustment_response.json()

        # Confirmar a movimentação
        assert movement["product_id"] == product_id
        assert movement["lot_id"] == lot_id
        assert movement["movement_type"] == "ajuste"
        assert movement["quantity"] == 15
        assert movement["reason"] == "Correção de inventário CT-13"

        # Consultar o lote novamente
        lots_response = await client.get(
            "/lots/",
        )

        assert lots_response.status_code == 200

        lots = lots_response.json()

        updated_lot = next(
            item
            for item in lots
            if item["id"] == lot_id
        )

        # O estoque deve ter sido corrigido para 15
        assert updated_lot["quantity"] == 15

        # Confirmar que o ajuste foi registrado no histórico
        movements_response = await client.get(
            "/movements/",
        )

        assert movements_response.status_code == 200

        movements = movements_response.json()

        matching_movement = next(
            (
                item
                for item in movements
                if item["id"] == movement["id"]
            ),
            None,
        )

        assert matching_movement is not None
        assert matching_movement["movement_type"] == "ajuste"
        assert matching_movement["quantity"] == 15
        assert matching_movement["reason"] == (
            "Correção de inventário CT-13"
        )


@pytest.mark.asyncio
async def test_ajuste_sem_motivo_deve_ser_rejeitado():
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

        # Procurar o produto de teste
        products_response = await client.get(
            "/products/",
        )

        assert products_response.status_code == 200

        products = products_response.json()

        product = next(
            (
                item
                for item in products
                if item["barcode"] == "PYTEST-CT13-001"
            ),
            None,
        )

        assert product is not None

        product_id = product["id"]

        # Criar um novo lote com 10 unidades
        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT14-001",
                "quantity": 10,
                "expiration_date": None,
            },
        )

        assert lot_response.status_code == 201

        lot = lot_response.json()

        lot_id = lot["id"]

        initial_quantity = lot["quantity"]

        # Tentar realizar ajuste sem informar motivo
        adjustment_response = await client.post(
            "/movements/",
            headers=headers,
            json={
                "barcode": "PYTEST-CT13-001",
                "lot_id": lot_id,
                "movement_type": "ajuste",
                "quantity": 20,
                "reason": None,
            },
        )

        assert adjustment_response.status_code == 400

        data = adjustment_response.json()

        assert data["detail"] == (
            "Ajuste de estoque precisa informar um motivo."
        )

        # Confirmar que o estoque não foi alterado
        lots_response = await client.get(
            "/lots/",
        )

        assert lots_response.status_code == 200

        lots = lots_response.json()

        updated_lot = next(
            item
            for item in lots
            if item["id"] == lot_id
        )

        assert updated_lot["quantity"] == initial_quantity



        
