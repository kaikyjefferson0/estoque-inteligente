import pytest

from app.models.product import Product
from app.services import products as service


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def dados_refrigerante(**alteracoes) -> dict:
    dados = {
        "nome": "Refrigerante 2L",
        "codigo_barras": "7891000000001",
        "estoque_minimo": 10,
        "controla_validade": True,
        "dias_alerta_validade": 30,
    }
    dados.update(alteracoes)
    return dados


# --- Casos de teste do docs\casos-de-teste.md ---


def test_ct04_admin_cadastra_produto_visivel_na_lista(client, token_admin, fornecedor):
    """CT-04 / RN-05: produto salvo e visível na lista."""
    headers = auth(token_admin)
    resposta = client.post("/products", headers=headers, json=dados_refrigerante(fornecedor_id=fornecedor.id))
    assert resposta.status_code == 201
    produto = resposta.json()
    assert produto["codigo_barras"] == "7891000000001"
    assert produto["estoque_minimo"] == 10
    assert produto["controla_validade"] is True
    assert produto["dias_alerta_validade"] == 30
    assert produto["fornecedor_id"] == fornecedor.id

    lista = client.get("/products", headers=headers)
    assert lista.status_code == 200
    assert produto["id"] in [p["id"] for p in lista.json()["itens"]]


def test_ct05_codigo_de_barras_repetido(client, db, token_admin, refrigerante):
    """CT-05 / RN-04: recusa com 409 e não salva o duplicado."""
    resposta = client.post(
        "/products", headers=auth(token_admin), json=dados_refrigerante(nome="Outro Refrigerante")
    )
    assert resposta.status_code == 409
    assert db.query(Product).filter(Product.codigo_barras == refrigerante.codigo_barras).count() == 1


def test_ct24_produto_com_fornecedor_inexistente(client, db, token_operador):
    """CT-24 / RN-24: fornecedor informado precisa existir."""
    resposta = client.post("/products", headers=auth(token_operador), json=dados_refrigerante(fornecedor_id=999999))
    assert resposta.status_code == 422
    assert db.query(Product).count() == 0


def test_ct26_controla_validade_sem_dias_de_alerta(client, db, token_operador):
    """CT-26 / RN-26: dias de alerta obrigatórios e > 0 quando controla validade."""
    headers = auth(token_operador)
    sem_dias = dados_refrigerante()
    del sem_dias["dias_alerta_validade"]
    tentativas = [
        sem_dias,
        dados_refrigerante(dias_alerta_validade=None),
        dados_refrigerante(dias_alerta_validade=0),
        dados_refrigerante(dias_alerta_validade=-5),
        # O contrário também é recusado: sem validade, os dias ficam vazios
        dados_refrigerante(controla_validade=False, dias_alerta_validade=30),
    ]
    for dados in tentativas:
        resposta = client.post("/products", headers=headers, json=dados)
        assert resposta.status_code == 422, dados

    assert db.query(Product).count() == 0


# --- Testes extras ---


def test_produto_sem_validade_e_sem_fornecedor(client, token_operador):
    """RN-24 e RN-26: fornecedor opcional; sem validade, sem dias de alerta."""
    resposta = client.post(
        "/products",
        headers=auth(token_operador),
        json={"nome": "Detergente", "codigo_barras": "7891000000002", "estoque_minimo": 5},
    )
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["controla_validade"] is False
    assert corpo["dias_alerta_validade"] is None
    assert corpo["fornecedor_id"] is None


def test_estoque_minimo_negativo_recusado(client, token_operador):
    resposta = client.post(
        "/products",
        headers=auth(token_operador),
        json={"nome": "Detergente", "codigo_barras": "7891000000002", "estoque_minimo": -1},
    )
    assert resposta.status_code == 422


def test_busca_por_nome_ou_codigo(client, token_operador, refrigerante, detergente):
    headers = auth(token_operador)

    def ids(busca):
        resposta = client.get("/products", headers=headers, params={"busca": busca})
        assert resposta.status_code == 200
        return {p["id"] for p in resposta.json()["itens"]}

    assert ids("refriger") == {refrigerante.id}  # parte do nome, sem diferenciar maiúsculas
    assert ids("7891000000002") == {detergente.id}  # código de barras completo
    assert ids("789100000000") == {refrigerante.id, detergente.id}  # parte do código
    assert ids("%") == set()  # curinga do LIKE tratado como texto
    assert ids("") == {refrigerante.id, detergente.id}  # sem busca, lista tudo


def test_obter_produto(client, token_operador, refrigerante):
    headers = auth(token_operador)
    resposta = client.get(f"/products/{refrigerante.id}", headers=headers)
    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Refrigerante 2L"

    assert client.get("/products/999999", headers=headers).status_code == 404


def test_admin_edita_produto(client, db, token_admin, refrigerante):
    """RN-19: o admin edita produto já cadastrado."""
    resposta = client.patch(
        f"/products/{refrigerante.id}",
        headers=auth(token_admin),
        json={"nome": "Refrigerante 2,5L", "estoque_minimo": 12},
    )
    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Refrigerante 2,5L"
    assert resposta.json()["estoque_minimo"] == 12

    db.refresh(refrigerante)
    assert refrigerante.estoque_minimo == 12


def test_edicao_respeita_regra_de_validade(client, token_admin, refrigerante):
    """RN-26 vale no estado final: desligar a validade exige limpar os dias de alerta."""
    headers = auth(token_admin)
    url = f"/products/{refrigerante.id}"

    assert client.patch(url, headers=headers, json={"controla_validade": False}).status_code == 422
    assert client.patch(url, headers=headers, json={"dias_alerta_validade": None}).status_code == 422

    resposta = client.patch(url, headers=headers, json={"controla_validade": False, "dias_alerta_validade": None})
    assert resposta.status_code == 200
    assert resposta.json()["dias_alerta_validade"] is None


def test_edicao_com_codigo_de_outro_produto_ou_fornecedor_inexistente(client, token_admin, refrigerante, detergente):
    headers = auth(token_admin)
    url = f"/products/{detergente.id}"
    assert client.patch(url, headers=headers, json={"codigo_barras": refrigerante.codigo_barras}).status_code == 409
    assert client.patch(url, headers=headers, json={"fornecedor_id": 999999}).status_code == 422
    # Manter o próprio código não é conflito
    assert client.patch(url, headers=headers, json={"codigo_barras": detergente.codigo_barras}).status_code == 200


def test_edicao_nao_aceita_nulo_em_campo_obrigatorio(client, token_admin, detergente):
    resposta = client.patch(f"/products/{detergente.id}", headers=auth(token_admin), json={"codigo_barras": None})
    assert resposta.status_code == 422


def test_admin_edita_produto_inexistente_devolve_404(client, token_admin):
    assert client.patch("/products/999999", headers=auth(token_admin), json={"nome": "X"}).status_code == 404


def test_codigo_duplicado_na_corrida_vira_erro_de_dominio(db, refrigerante, monkeypatch):
    """Se a checagem prévia não pegar (corrida), o UNIQUE do banco vira CodigoBarrasJaCadastradoError (409)."""
    monkeypatch.setattr(service, "_codigo_em_uso", lambda *args, **kwargs: False)
    with pytest.raises(service.CodigoBarrasJaCadastradoError):
        service.criar_produto(db, nome="Corrida", codigo_barras=refrigerante.codigo_barras, estoque_minimo=0)
    assert db.query(Product).filter(Product.codigo_barras == refrigerante.codigo_barras).count() == 1


def test_ct52_busca_pelo_codigo_de_barras_exato(client, token_admin, token_operador, refrigerante, detergente):
    """CT-52 / RN-04: busca exata, para qualquer perfil logado."""
    for token in (token_admin, token_operador):
        resposta = client.get(f"/products/by-barcode/{refrigerante.codigo_barras}", headers=auth(token))
        assert resposta.status_code == 200
        assert resposta.json()["id"] == refrigerante.id

    # Só parecido (parte do código) não serve: a leitura nunca pega o produto errado
    assert client.get("/products/by-barcode/789100000000", headers=auth(token_operador)).status_code == 404
    assert client.get("/products/by-barcode/0000000000000", headers=auth(token_operador)).json() == {
        "detail": "Produto não encontrado. Ele pode ter sido removido; confira o código ou atualize a página."
    }
    # Curinga do LIKE não funciona como curinga
    assert client.get("/products/by-barcode/%25", headers=auth(token_operador)).status_code == 404
    assert client.get(f"/products/by-barcode/{refrigerante.codigo_barras}").status_code == 401


def test_service_busca_por_codigo_ignora_espacos_e_recusa_vazio(db, refrigerante):
    assert service.obter_por_codigo(db, f"  {refrigerante.codigo_barras} ").id == refrigerante.id
    with pytest.raises(service.ProdutoNaoEncontradoError):
        service.obter_por_codigo(db, "   ")
