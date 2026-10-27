import pytest

from app.models.supplier import Supplier
from app.services import suppliers as service


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# --- Casos de teste do docs\casos-de-teste.md ---


def test_ct06_fornecedor_so_com_nome(client, token_operador):
    """CT-06 / RN-06: só o nome é obrigatório; CNPJ não é exigido."""
    resposta = client.post("/suppliers", headers=auth(token_operador), json={"nome": "Fornecedor Sem CNPJ"})
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["nome"] == "Fornecedor Sem CNPJ"
    assert corpo["cnpj"] is None

    # Vários fornecedores sem CNPJ convivem (o UNIQUE não pega NULL)
    outro = client.post("/suppliers", headers=auth(token_operador), json={"nome": "Outro Sem CNPJ", "cnpj": ""})
    assert outro.status_code == 201
    assert outro.json()["cnpj"] is None


def test_ct25_cnpj_repetido_ou_invalido(client, db, token_operador, fornecedor):
    """CT-25 / RN-25: CNPJ repetido devolve 409; inválido devolve 422. Nada é salvo."""
    headers = auth(token_operador)
    total_antes = db.query(Supplier).count()

    # Mesmo CNPJ do fixture, agora com pontuação
    repetido = client.post("/suppliers", headers=headers, json={"nome": "Cópia", "cnpj": "11.222.333/0001-81"})
    assert repetido.status_code == 409

    for cnpj in ("123", "1122233300018", "112223330001811", "11.222.333/0001-8X", "abcdefghijklmn"):
        resposta = client.post("/suppliers", headers=headers, json={"nome": "Inválido", "cnpj": cnpj})
        assert resposta.status_code == 422, cnpj

    assert db.query(Supplier).count() == total_antes


# --- Testes extras ---


def test_cnpj_salvo_so_com_numeros(client, token_operador):
    """RN-25: aceita com pontuação e guarda só os 14 números."""
    resposta = client.post(
        "/suppliers", headers=auth(token_operador), json={"nome": "Pontuado", "cnpj": "45.997.418/0001-53"}
    )
    assert resposta.status_code == 201
    assert resposta.json()["cnpj"] == "45997418000153"


def test_listar_e_obter_fornecedor(client, token_operador, fornecedor):
    headers = auth(token_operador)
    lista = client.get("/suppliers", headers=headers)
    assert lista.status_code == 200
    assert fornecedor.id in [f["id"] for f in lista.json()]

    obtido = client.get(f"/suppliers/{fornecedor.id}", headers=headers)
    assert obtido.status_code == 200
    assert obtido.json()["nome"] == fornecedor.nome

    assert client.get("/suppliers/999999", headers=headers).status_code == 404


def test_admin_edita_fornecedor(client, db, token_admin, fornecedor):
    """RN-19: o admin edita fornecedor já cadastrado."""
    resposta = client.patch(
        f"/suppliers/{fornecedor.id}",
        headers=auth(token_admin),
        json={"nome": "Distribuidora Nova", "cnpj": "45.997.418/0001-53"},
    )
    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Distribuidora Nova"
    assert resposta.json()["cnpj"] == "45997418000153"

    db.refresh(fornecedor)
    assert fornecedor.nome == "Distribuidora Nova"


def test_admin_edita_fornecedor_com_cnpj_de_outro_devolve_409(client, token_admin, token_operador, fornecedor):
    outro = client.post(
        "/suppliers", headers=auth(token_operador), json={"nome": "Outro", "cnpj": "45997418000153"}
    ).json()
    resposta = client.patch(f"/suppliers/{outro['id']}", headers=auth(token_admin), json={"cnpj": fornecedor.cnpj})
    assert resposta.status_code == 409


def test_admin_nao_anula_nome_do_fornecedor(client, token_admin, fornecedor):
    resposta = client.patch(f"/suppliers/{fornecedor.id}", headers=auth(token_admin), json={"nome": None})
    assert resposta.status_code == 422


def test_admin_edita_fornecedor_cnpj_invalido_ou_inexistente(client, token_admin, fornecedor):
    headers = auth(token_admin)
    assert client.patch(f"/suppliers/{fornecedor.id}", headers=headers, json={"cnpj": "123"}).status_code == 422
    assert client.patch("/suppliers/999999", headers=headers, json={"nome": "X"}).status_code == 404


def test_admin_remove_cnpj_do_fornecedor(client, db, token_admin, fornecedor):
    """RN-06: o CNPJ é opcional; null remove."""
    resposta = client.patch(f"/suppliers/{fornecedor.id}", headers=auth(token_admin), json={"cnpj": None})
    assert resposta.status_code == 200
    assert resposta.json()["cnpj"] is None
    db.refresh(fornecedor)
    assert fornecedor.cnpj is None


def test_cnpj_duplicado_na_corrida_vira_erro_de_dominio(db, fornecedor, monkeypatch):
    """Se a checagem prévia não pegar (corrida), o UNIQUE do banco vira CnpjJaCadastradoError (409)."""
    monkeypatch.setattr(service, "_cnpj_em_uso", lambda *args, **kwargs: False)
    with pytest.raises(service.CnpjJaCadastradoError):
        service.criar_fornecedor(db, nome="Corrida", cnpj=fornecedor.cnpj)
    assert db.query(Supplier).filter(Supplier.cnpj == fornecedor.cnpj).count() == 1
