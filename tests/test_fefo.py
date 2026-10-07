import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_saida_deve_consumir_primeiro_o_lote_com_validade_mais_proxima():
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

        # Criar um produto exclusivo para esta execução.
        # Isso evita que lotes antigos contaminem o teste FEFO.
        barcode = f"PYTEST-CT12-{uuid.uuid4().hex[:8]}"

        product_response = await client.post(
            "/products/",
            headers=headers,
            json={
                "name": "Produto Teste FEFO",
                "barcode": barcode,
                "minimum_stock": 0,
                "controls_expiration": True,
            },
        )

        assert product_response.status_code == 201

        product = product_response.json()
        product_id = product["id"]

        # Criar lote A:
        # 5 unidades com validade mais próxima.
        lot_a_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": f"PYTEST-CT12-A-{uuid.uuid4().hex[:8]}",
                "quantity": 5,
                "expiration_date": "2026-10-20",
            },
        )

        assert lot_a_response.status_code == 201

        lot_a = lot_a_response.json()

        # Criar lote B:
        # 10 unidades com validade mais distante.
        lot_b_response = await client.post(
            "/lots/",
            headers=headers,
            json={
                "product_id": product_id,
                "lot_code": f"PYTEST-CT12-B-{uuid.uuid4().hex[:8]}",
                "quantity": 10,
                "expiration_date": "2026-11-20",
            },
        )

        assert lot_b_response.status_code == 201

        lot_b = lot_b_response.json()

        # Retirar 8 unidades.
        #
        # FEFO esperado:
        # lote A -> retira 5
        # lote B -> retira 3
        #
        # Resultado esperado:
        # lote A -> 0
        # lote B -> 7
        movement_response = await client.post(
            "/movements/",
            headers=headers,
            json={
                "barcode": barcode,
                "movement_type": "saida",
                "quantity": 8,
                "reason": "Teste automatizado CT-12",
            },
        )

        assert movement_response.status_code == 201

        # Consultar os lotes depois da saída.
        lots_response = await client.get(
            "/lots/",
        )

        assert lots_response.status_code == 200

        lots = lots_response.json()

        updated_lot_a = next(
            item
            for item in lots
            if item["id"] == lot_a["id"]
        )

        updated_lot_b = next(
            item
            for item in lots
            if item["id"] == lot_b["id"]
        )

        # O lote com validade mais próxima deve ter sido
        # totalmente consumido primeiro.
        assert updated_lot_a["quantity"] == 0

        # O lote B deve ter fornecido as 3 unidades restantes.
        assert updated_lot_b["quantity"] == 7

        # Confirmar que as movimentações foram registradas.
        movements_response = await client.get(
            "/movements/",
        )

        assert movements_response.status_code == 200

        movements = movements_response.json()

        movement = next(
            (
                item
                for item in movements
                if item["movement_type"] == "saida"
                and item["reason"] == "Teste automatizado CT-12"
                and item["lot_id"] == lot_a["id"]
            ),
            None,
        )

        assert movement is not None
        assert movement["quantity"] == 5
        assert movement["lot_id"] == lot_a["id"]

        # Como a saída de 8 unidades foi dividida entre dois lotes,
        # deve existir também uma movimentação de 3 unidades no lote B.
        second_movement = next(
            (
                item
                for item in movements
                if item["movement_type"] == "saida"
                and item["reason"] == "Teste automatizado CT-12"
                and item["lot_id"] == lot_b["id"]
            ),
            None,
        )

        assert second_movement is not None
        assert second_movement["quantity"] == 3




