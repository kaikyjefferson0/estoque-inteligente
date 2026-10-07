import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_historico_de_movimentacao_nao_permite_edicao_ou_exclusao():
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
                if item["barcode"] == "PYTEST-CT15-001"
            ),
            None,
        )

        # Se ainda não existir, criar o produto
        if product is None:

            product_response = await client.post(
                "/products/",
                headers=headers,
                json={
                    "name": "Produto Teste CT-15",
                    "barcode": "PYTEST-CT15-001",
                    "minimum_stock": 0,
                    "controls_expiration": False,
                },
            )

            assert product_response.status_code == 201

            product = product_response.json()

        product_id = product["id"]

        # Criar um lote
        lot_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": "PYTEST-CT15-001",
                "quantity": 10,
                "expiration_date": None,
            },
        )

        assert lot_response.status_code == 201

        lot = lot_response.json()

        lot_id = lot["id"]

        # Registrar uma movimentação
        movement_response = await client.post(
            "/movements/",
            headers=headers,
            json={
                "barcode": "PYTEST-CT15-001",
                "lot_id": lot_id,
                "movement_type": "entrada",
                "quantity": 5,
                "reason": "Teste automatizado CT-15",
            },
        )

        assert movement_response.status_code == 201

        movement = movement_response.json()

        movement_id = movement["id"]

        # Consultar o histórico
        history_response = await client.get(
            "/movements/",
        )

        assert history_response.status_code == 200

        history = history_response.json()

        original_movement = next(
            (
                item
                for item in history
                if item["id"] == movement_id
            ),
            None,
        )

        assert original_movement is not None

        assert original_movement["quantity"] == 5

        assert original_movement["reason"] == (
            "Teste automatizado CT-15"
        )

        # =========================================================
        # TENTATIVA DE EDIÇÃO
        # =========================================================

        update_response = await client.put(
            f"/movements/{movement_id}",
            headers=headers,
            json={
                "quantity": 999,
                "reason": "Tentativa de alteração",
            },
        )

        # Não existe endpoint PUT para movimentações.
        assert update_response.status_code in {
            404,
            405,
        }

        # =========================================================
        # TENTATIVA DE EXCLUSÃO
        # =========================================================

        delete_response = await client.delete(
            f"/movements/{movement_id}",
            headers=headers,
        )

        # Não existe endpoint DELETE para movimentações.
        assert delete_response.status_code in {
            404,
            405,
        }

        # =========================================================
        # CONFIRMAR QUE O HISTÓRICO CONTINUA INALTERADO
        # =========================================================

        final_history_response = await client.get(
            "/movements/",
        )

        assert final_history_response.status_code == 200

        final_history = final_history_response.json()

        final_movement = next(
            (
                item
                for item in final_history
                if item["id"] == movement_id
            ),
            None,
        )

        assert final_movement is not None

        assert final_movement["quantity"] == 5

        assert final_movement["reason"] == (
            "Teste automatizado CT-15"
        )

        assert final_movement["movement_type"] == "entrada"

        assert final_movement["lot_id"] == lot_id

        assert final_movement["product_id"] == product_id


