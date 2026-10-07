import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_admin_cria_produto_com_dados_validos():
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

        # Código de barras exclusivo para esta execução.
        barcode = (
            f"PYTEST-CT04-{uuid.uuid4().hex[:8]}"
        )

        response = await client.post(
            "/products/",
            headers={
                "Authorization": f"Bearer {token}",
            },
            json={
                "name": "Produto Teste Pytest 04",
                "barcode": barcode,
                "minimum_stock": 10,
                "controls_expiration": False,
            },
        )

    assert response.status_code == 201

    data = response.json()

    assert data["name"] == "Produto Teste Pytest 04"
    assert data["barcode"] == barcode
    assert data["minimum_stock"] == 10
    assert data["controls_expiration"] is False
    assert "id" in data


@pytest.mark.asyncio
async def test_nao_permite_codigo_de_barras_duplicado():
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

        # Criar primeiro produto.
        barcode = (
            f"PYTEST-CT05-{uuid.uuid4().hex[:8]}"
        )

        first_response = await client.post(
            "/products/",
            headers=headers,
            json={
                "name": "Produto Original CT-05",
                "barcode": barcode,
                "minimum_stock": 5,
                "controls_expiration": False,
            },
        )

        assert first_response.status_code == 201

        # Tentar criar outro produto com o mesmo código.
        duplicate_response = await client.post(
            "/products/",
            headers=headers,
            json={
                "name": "Produto Duplicado CT-05",
                "barcode": barcode,
                "minimum_stock": 5,
                "controls_expiration": False,
            },
        )

    assert duplicate_response.status_code == 409

    data = duplicate_response.json()

    assert data["detail"] == (
        "Já existe um produto com este código de barras."
    )


    
