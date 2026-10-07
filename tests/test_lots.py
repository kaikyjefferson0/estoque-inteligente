import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_produto_com_validade_exige_data_no_lote():
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

        # Procurar o produto que controla validade
        products_response = await client.get(
            "/products/",
        )

        assert products_response.status_code == 200

        products = products_response.json()

        product = next(
            (
                item
                for item in products
                if item["barcode"] == "PYTEST-CT09-001"
            ),
            None,
        )

        # Se ainda não existir, criar o produto de teste
        if product is None:

            product_response = await client.post(
                "/products/",
                headers=headers,
                json={
                    "name": "Produto Teste CT-09",
                    "barcode": "PYTEST-CT09-001",
                    "minimum_stock": 5,
                    "controls_expiration": True,
                },
            )

            assert product_response.status_code == 201

            product = product_response.json()

        assert product["controls_expiration"] is True

        product_id = product["id"]

        # Tentar criar lote sem informar validade
        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT09-001",
                "quantity": 10,
                "expiration_date": None,
            },
        )

    assert lot_response.status_code == 400

    data = lot_response.json()

    assert data["detail"] == (
        "Este produto controla validade. "
        "Informe a data de validade."
    )
    