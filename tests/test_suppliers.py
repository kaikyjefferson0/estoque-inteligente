import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_cadastra_fornecedor_sem_cnpj():
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

        response = await client.post(
            "/suppliers/",
            headers={
                "Authorization": f"Bearer {token}",
            },
            json={
                "name": "Fornecedor Teste Pytest",
            },
        )

    assert response.status_code == 201

    data = response.json()

    assert "id" in data
    assert data["name"] == "Fornecedor Teste Pytest"
    assert data["cnpj"] is None
    