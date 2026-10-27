"""Permissões dos cadastros (CT-21 a CT-23): valem igualmente para produtos e fornecedores."""

from app.models.product import Product
from app.models.supplier import Supplier


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# --- Casos de teste do docs\casos-de-teste.md ---


def test_ct21_operador_cadastra_produto_e_fornecedor(client, db, token_operador):
    """CT-21 / RN-19: o operador cadastra produto e fornecedor."""
    headers = auth(token_operador)
    fornecedor = client.post("/suppliers", headers=headers, json={"nome": "Fornecedor do Operador"})
    assert fornecedor.status_code == 201

    produto = client.post(
        "/products",
        headers=headers,
        json={
            "nome": "Detergente",
            "codigo_barras": "7891000000002",
            "estoque_minimo": 5,
            "fornecedor_id": fornecedor.json()["id"],
        },
    )
    assert produto.status_code == 201

    assert db.get(Supplier, fornecedor.json()["id"]) is not None
    assert db.get(Product, produto.json()["id"]) is not None


def test_ct22_operador_nao_edita_produto_nem_fornecedor(client, db, token_operador, refrigerante, fornecedor):
    """CT-22 / RN-19: só o admin edita; os dados continuam iguais."""
    headers = auth(token_operador)
    produto = client.patch(f"/products/{refrigerante.id}", headers=headers, json={"nome": "Alterado"})
    forn = client.patch(f"/suppliers/{fornecedor.id}", headers=headers, json={"nome": "Alterado"})
    assert produto.status_code == 403
    assert forn.status_code == 403

    db.refresh(refrigerante)
    db.refresh(fornecedor)
    assert refrigerante.nome == "Refrigerante 2L"
    assert fornecedor.nome == "Distribuidora Central"


def test_ct23_nao_existe_exclusao(client, db, token_admin, token_operador, refrigerante, fornecedor):
    """CT-23 / RN-23: nem o admin apaga; a rota DELETE não existe."""
    for token in (token_admin, token_operador):
        headers = auth(token)
        assert client.delete(f"/products/{refrigerante.id}", headers=headers).status_code == 405
        assert client.delete(f"/suppliers/{fornecedor.id}", headers=headers).status_code == 405

    assert db.get(Product, refrigerante.id) is not None
    assert db.get(Supplier, fornecedor.id) is not None


# --- Testes extras (RN-18) ---


def test_sem_token_devolve_401(client, refrigerante, fornecedor):
    tentativas = [
        client.get("/products"),
        client.get(f"/products/{refrigerante.id}"),
        client.post("/products", json={"nome": "X", "codigo_barras": "1", "estoque_minimo": 0}),
        client.patch(f"/products/{refrigerante.id}", json={"nome": "X"}),
        client.get("/suppliers"),
        client.get(f"/suppliers/{fornecedor.id}"),
        client.post("/suppliers", json={"nome": "X"}),
        client.patch(f"/suppliers/{fornecedor.id}", json={"nome": "X"}),
    ]
    for resposta in tentativas:
        assert resposta.status_code == 401
