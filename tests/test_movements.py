import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_entrada_de_10_unidades_por_codigo_de_barras():
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

        # Consultar produtos
        products_response = await client.get(
            "/products/",
        )

        assert products_response.status_code == 200

        products = products_response.json()

        # Procurar o produto criado no CT-04
        product = next(
            (
                item
                for item in products
                if item["barcode"] == "PYTEST-CT04-002"
            ),
            None,
        )

        assert product is not None

        product_id = product["id"]

        # Criar um lote com 1 unidade inicial
        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT07-001",
                "quantity": 1,
                "expiration_date": None,
            },
        )

        assert lot_response.status_code == 201

        lot = lot_response.json()

        lot_id = lot["id"]
        initial_quantity = lot["quantity"]

        # Registrar entrada de 10 unidades usando código de barras
        movement_response = await client.post(
            "/movements/",
            headers=headers,
            json={
                "barcode": "PYTEST-CT04-002",
                "lot_id": lot_id,
                "movement_type": "entrada",
                "quantity": 10,
                "reason": "Teste automatizado CT-07",
            },
        )

        assert movement_response.status_code == 201

        movement = movement_response.json()

        # Confirmar os dados da movimentação
        assert movement["product_id"] == product_id
        assert movement["lot_id"] == lot_id
        assert movement["movement_type"] == "entrada"
        assert movement["quantity"] == 10

        # Consultar os lotes
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

        # O estoque deve ter aumentado exatamente 10 unidades
        assert updated_lot["quantity"] == initial_quantity + 10

        # Consultar o histórico de movimentações
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

        # Confirmar que a entrada foi registrada no histórico
        assert matching_movement is not None
        assert matching_movement["movement_type"] == "entrada"
        assert matching_movement["quantity"] == 10


@pytest.mark.asyncio
async def test_entrada_com_quantidade_zero_deve_ser_rejeitada():
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

        # Tentar registrar entrada com quantidade zero
        response = await client.post(
            "/movements/",
            headers=headers,
            json={
                "barcode": "PYTEST-CT04-002",
                "movement_type": "entrada",
                "quantity": 0,
                "reason": "Teste automatizado CT-08",
            },
        )

    assert response.status_code == 400

    data = response.json()

    assert data["detail"] == (
        "A quantidade deve ser maior que zero."
    )


@pytest.mark.asyncio
async def test_entrada_com_quantidade_negativa_deve_ser_rejeitada():
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

        # Tentar registrar entrada com quantidade negativa
        response = await client.post(
            "/movements/",
            headers=headers,
            json={
                "barcode": "PYTEST-CT04-002",
                "movement_type": "entrada",
                "quantity": -5,
                "reason": "Teste automatizado CT-08",
            },
        )

    # O Pydantic deve rejeitar a quantidade negativa
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_saida_de_3_unidades_com_estoque_suficiente():
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

        # Consultar os produtos
        products_response = await client.get(
            "/products/",
        )

        assert products_response.status_code == 200

        products = products_response.json()

        # Procurar o mesmo produto utilizado nos testes anteriores
        product = next(
            (
                item
                for item in products
                if item["barcode"] == "PYTEST-CT04-002"
            ),
            None,
        )

        assert product is not None

        product_id = product["id"]

        # Consultar os lotes antes da saída
        lots_response = await client.get(
            "/lots/",
        )

        assert lots_response.status_code == 200

        lots = lots_response.json()

        product_lots = [
            lot
            for lot in lots
            if lot["product_id"] == product_id
            and lot["quantity"] > 0
        ]

        assert product_lots

        initial_stock = sum(
            lot["quantity"]
            for lot in product_lots
        )

        # Precisamos ter estoque suficiente
        assert initial_stock >= 3

        # Registrar saída de 3 unidades
        movement_response = await client.post(
            "/movements/",
            headers=headers,
            json={
                "barcode": "PYTEST-CT04-002",
                "movement_type": "saida",
                "quantity": 3,
                "reason": "Teste automatizado CT-10",
            },
        )

        assert movement_response.status_code == 201

        movement = movement_response.json()

        # Confirmar a movimentação
        assert movement["product_id"] == product_id
        assert movement["movement_type"] == "saida"
        assert movement["quantity"] == 3

        # Consultar novamente os lotes
        lots_response = await client.get(
            "/lots/",
        )

        assert lots_response.status_code == 200

        updated_lots = lots_response.json()

        updated_product_lots = [
            lot
            for lot in updated_lots
            if lot["product_id"] == product_id
        ]

        final_stock = sum(
            lot["quantity"]
            for lot in updated_product_lots
        )

        # O estoque deve ter diminuído exatamente 3 unidades
        assert final_stock == initial_stock - 3

        # Confirmar a movimentação no histórico
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
        assert matching_movement["movement_type"] == "saida"
        assert matching_movement["quantity"] == 3


@pytest.mark.asyncio
async def test_saida_maior_que_estoque_deve_ser_rejeitada():
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

        # Consultar os produtos
        products_response = await client.get(
            "/products/",
        )

        assert products_response.status_code == 200

        products = products_response.json()

        product = next(
            (
                item
                for item in products
                if item["barcode"] == "PYTEST-CT04-002"
            ),
            None,
        )

        assert product is not None

        product_id = product["id"]

        # Consultar o estoque antes da tentativa
        lots_response = await client.get(
            "/lots/",
        )

        assert lots_response.status_code == 200

        lots = lots_response.json()

        product_lots = [
            lot
            for lot in lots
            if lot["product_id"] == product_id
        ]

        initial_stock = sum(
            lot["quantity"]
            for lot in product_lots
        )

        # Tentar retirar uma quantidade muito maior
        response = await client.post(
            "/movements/",
            headers=headers,
            json={
                "barcode": "PYTEST-CT04-002",
                "movement_type": "saida",
                "quantity": 100000,
                "reason": "Teste automatizado CT-11",
            },
        )

        assert response.status_code == 400

        data = response.json()

        assert data["detail"] == "Estoque insuficiente."

        # Confirmar que o estoque permaneceu inalterado
        lots_response = await client.get(
            "/lots/",
        )

        assert lots_response.status_code == 200

        updated_lots = lots_response.json()

        updated_product_lots = [
            lot
            for lot in updated_lots
            if lot["product_id"] == product_id
        ]

        final_stock = sum(
            lot["quantity"]
            for lot in updated_product_lots
        )

        assert final_stock == initial_stock
        
        

    
        
        
        