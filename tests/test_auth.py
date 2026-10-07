import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_login_com_sucesso():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:

        response = await client.post(
            "/auth/login",
            json={
                "email": "admin@estoque.com",
                "password": "kaiky04261314",
            },
        )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_com_senha_incorreta():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:

        response = await client.post(
            "/auth/login",
            json={
                "email": "admin@estoque.com",
                "password": "senha_errada_123",
            },
        )

    assert response.status_code == 401

    data = response.json()

    assert data["detail"] == "E-mail ou senha inválidos."


@pytest.mark.asyncio
async def test_operador_nao_pode_acessar_usuarios():
    transport = ASGITransport(app=app)

    async with AsyncClient(
        transport=transport,
        base_url="http://test",
    ) as client:

        login_response = await client.post(
            "/auth/login",
            json={
                "email": "kaiky22@gmail.com",
                "password": "jefferson04261314",
            },
        )

        assert login_response.status_code == 200

        token = login_response.json()["access_token"]

        response = await client.get(
            "/users/",
            headers={
                "Authorization": f"Bearer {token}",
            },
        )

    assert response.status_code == 403

    data = response.json()

    assert data["detail"] == (
        "Acesso permitido somente para administradores."
    )



    