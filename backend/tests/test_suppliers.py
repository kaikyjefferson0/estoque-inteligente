import pytest

from app.core.security import create_access_token
from app.models.product import Product
from app.models.supplier import Supplier
from app.services import suppliers as service
from app.services.products import criar_produto
from tests.test_demo import _conta_demo


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


def test_cnpj_so_com_pontuacao_e_recusado(client, db, token_operador, token_admin, fornecedor):
    """RN-25: só pontuação foi informado e não tem 14 números; vazio ou só espaços continua sem CNPJ (RN-06)."""
    total_antes = db.query(Supplier).count()
    for cnpj in (".", "../-", "  ./-  ", "..-//", ". . ."):
        criar = client.post("/suppliers", headers=auth(token_operador), json={"nome": "Só pontuação", "cnpj": cnpj})
        assert criar.status_code == 422, cnpj
        editar = client.patch(f"/suppliers/{fornecedor.id}", headers=auth(token_admin), json={"cnpj": cnpj})
        assert editar.status_code == 422, cnpj
    assert db.query(Supplier).count() == total_antes

    espacos = client.post("/suppliers", headers=auth(token_operador), json={"nome": "Espaços", "cnpj": "   "})
    assert espacos.status_code == 201
    assert espacos.json()["cnpj"] is None


def test_listar_e_obter_fornecedor(client, token_operador, fornecedor):
    headers = auth(token_operador)
    lista = client.get("/suppliers", headers=headers)
    assert lista.status_code == 200
    assert fornecedor.id in [f["id"] for f in lista.json()["itens"]]

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


# --- Exclusão e substituição (RN-19, RN-59; CT-85 a CT-90) ---

NAO_ENCONTRADO = "Fornecedor não encontrado. Ele pode ter sido removido; atualize a página."
CNPJ_REPETIDO = "Este CNPJ já está cadastrado em outro fornecedor. Confira o número."


def _produto_do_fornecedor(db, fornecedor_id: int, codigo_barras: str) -> Product:
    return criar_produto(db, nome=f"Produto {codigo_barras}", codigo_barras=codigo_barras, estoque_minimo=1, fornecedor_id=fornecedor_id)


def _cabecalho_demo(db) -> dict[str, str]:
    return auth(create_access_token(_conta_demo(db).id))


def test_ct85_admin_exclui_fornecedor_sem_produtos(client, db, token_admin):
    """CT-85 / RN-59: 204 sem corpo; o fornecedor some da lista e o GET dele devolve 404."""
    headers = auth(token_admin)
    fornecedor = client.post("/suppliers", headers=headers, json={"nome": "Sem Produtos"}).json()

    resposta = client.delete(f"/suppliers/{fornecedor['id']}", headers=headers)
    assert resposta.status_code == 204
    assert resposta.content == b""

    assert db.get(Supplier, fornecedor["id"]) is None
    assert client.get(f"/suppliers/{fornecedor['id']}", headers=headers).status_code == 404
    assert fornecedor["id"] not in [f["id"] for f in client.get("/suppliers", headers=headers).json()["itens"]]


def test_ct86_fornecedor_com_produtos_nao_e_excluido(client, db, token_admin, fornecedor, refrigerante):
    """CT-86 / RN-59: 409 com a contagem certa; fornecedor e produtos continuam iguais."""
    outro = _produto_do_fornecedor(db, fornecedor.id, "7891000008601")

    resposta = client.delete(f"/suppliers/{fornecedor.id}", headers=auth(token_admin))
    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Este fornecedor tem 2 produto(s) vinculado(s) e não pode ser excluído."

    db.expire_all()
    assert db.get(Supplier, fornecedor.id).nome == "Distribuidora Central"
    assert db.get(Product, refrigerante.id).fornecedor_id == fornecedor.id
    assert db.get(Product, outro.id).fornecedor_id == fornecedor.id


def test_ct86_produto_ligado_depois_da_contagem_vira_409(client, db, token_admin, fornecedor, monkeypatch):
    """CT-86 / RN-59: se a contagem não pegar o produto (corrida), a FK do banco recusa e vira o mesmo 409.
    A corrida de verdade, com duas conexões, está em test_concorrencia.py."""
    produto = _produto_do_fornecedor(db, fornecedor.id, "7891000008602")
    contar = service._contar_produtos
    chamadas = []

    def zero_na_primeira_contagem(*args, **kwargs):
        chamadas.append(1)
        return 0 if len(chamadas) == 1 else contar(*args, **kwargs)

    monkeypatch.setattr(service, "_contar_produtos", zero_na_primeira_contagem)
    resposta = client.delete(f"/suppliers/{fornecedor.id}", headers=auth(token_admin))
    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Este fornecedor tem 1 produto(s) vinculado(s) e não pode ser excluído."
    db.expire_all()
    assert db.get(Supplier, fornecedor.id) is not None
    assert db.get(Product, produto.id).fornecedor_id == fornecedor.id


def test_ct87_excluir_ou_substituir_fornecedor_inexistente(client, db, token_admin):
    """CT-87 / RN-59 e RN-19: 404 com a mesma mensagem do GET e do PATCH; nada é criado."""
    headers = auth(token_admin)
    total_antes = db.query(Supplier).count()

    respostas = [
        client.delete("/suppliers/999999", headers=headers),
        client.put("/suppliers/999999", headers=headers, json={"nome": "Novo", "cnpj": None}),
        client.get("/suppliers/999999", headers=headers),
        client.patch("/suppliers/999999", headers=headers, json={"nome": "Novo"}),
    ]
    for resposta in respostas:
        assert resposta.status_code == 404
        assert resposta.json()["detail"] == NAO_ENCONTRADO
    assert db.query(Supplier).count() == total_antes


def test_ct88_operador_nao_exclui_fornecedor(client, db, token_operador, fornecedor, refrigerante):
    """CT-88 / RN-59: o operador recebe 403, com e sem produtos, e o fornecedor continua salvo."""
    headers = auth(token_operador)
    sem_produtos = client.post("/suppliers", headers=headers, json={"nome": "Sem Produtos"}).json()

    for fornecedor_id in (fornecedor.id, sem_produtos["id"]):
        resposta = client.delete(f"/suppliers/{fornecedor_id}", headers=headers)
        assert resposta.status_code == 403
        assert db.get(Supplier, fornecedor_id) is not None


def test_ct88_conta_demo_nao_exclui_e_nao_gasta_a_cota(client, db):
    """CT-88 / RN-59 e RN-56: a conta demo é operador; recebe 403 antes de o limitador contar."""
    cabecalho = _cabecalho_demo(db)
    sem_produtos = client.post("/suppliers", headers=cabecalho, json={"nome": "Da Demo"}).json()
    for _ in range(35):
        assert client.delete(f"/suppliers/{sem_produtos['id']}", headers=cabecalho).status_code == 403
    assert db.get(Supplier, sem_produtos["id"]) is not None
    # Só o POST acima contou (1 de 30): a demo ainda pode alterar
    assert client.post("/suppliers", headers=cabecalho, json={"nome": "Outra da Demo"}).status_code == 201


def test_ct89_substituir_fornecedor_pelo_put(client, db, token_admin, token_operador, fornecedor):
    """CT-89 / RN-19 e RN-06: admin e operador substituem com o corpo completo; cnpj null deixa sem CNPJ."""
    url = f"/suppliers/{fornecedor.id}"

    admin = client.put(url, headers=auth(token_admin), json={"nome": "  Distribuidora Nova  ", "cnpj": "45.997.418/0001-53"})
    assert admin.status_code == 200
    assert admin.json()["nome"] == "Distribuidora Nova"
    assert admin.json()["cnpj"] == "45997418000153"

    operador = client.put(url, headers=auth(token_operador), json={"nome": "Só o Nome", "cnpj": None})
    assert operador.status_code == 200
    assert operador.json()["cnpj"] is None

    db.refresh(fornecedor)
    assert (fornecedor.nome, fornecedor.cnpj) == ("Só o Nome", None)


def test_ct89_put_com_chave_faltando_ou_cnpj_invalido_nao_altera_nada(client, db, token_admin, fornecedor):
    """CT-89 / RN-19 e RN-25: 422 sem alterar nada."""
    headers = auth(token_admin)
    url = f"/suppliers/{fornecedor.id}"
    invalidos = [
        {"nome": "Sem a chave cnpj"},
        {"cnpj": "45997418000153"},
        {},
        {"nome": None, "cnpj": None},
        {"nome": "   ", "cnpj": None},
        {"nome": "CNPJ curto", "cnpj": "123"},
        {"nome": "Só pontuação", "cnpj": "../-"},
        {"nome": "Chave a mais", "cnpj": None, "id": 1},
    ]
    for corpo in invalidos:
        assert client.put(url, headers=headers, json=corpo).status_code == 422, corpo

    db.refresh(fornecedor)
    assert (fornecedor.nome, fornecedor.cnpj) == ("Distribuidora Central", "11222333000181")


def test_ct90_put_com_cnpj_de_outro_fornecedor(client, token_admin, token_operador, fornecedor):
    """CT-90 / RN-19 e RN-25: 409 e o fornecedor continua como estava (nem o nome muda)."""
    outro = client.post("/suppliers", headers=auth(token_operador), json={"nome": "Outro", "cnpj": "45997418000153"}).json()

    for cnpj in ("11222333000181", "11.222.333/0001-81"):
        resposta = client.put(f"/suppliers/{outro['id']}", headers=auth(token_admin), json={"nome": "Nome Novo", "cnpj": cnpj})
        assert resposta.status_code == 409
        assert resposta.json()["detail"] == CNPJ_REPETIDO

    atual = client.get(f"/suppliers/{outro['id']}", headers=auth(token_admin)).json()
    assert (atual["nome"], atual["cnpj"]) == ("Outro", "45997418000153")


def test_put_mantendo_o_proprio_cnpj(client, token_admin, fornecedor):
    """RN-25: o CNPJ do próprio fornecedor não conta como repetido."""
    resposta = client.put(f"/suppliers/{fornecedor.id}", headers=auth(token_admin), json={"nome": "Renomeado", "cnpj": fornecedor.cnpj})
    assert resposta.status_code == 200
    assert resposta.json()["cnpj"] == fornecedor.cnpj


def test_cnpj_fica_livre_depois_da_exclusao(client, token_admin, token_operador):
    """RN-25: o CNPJ de um fornecedor excluído pode ser usado por outro."""
    primeiro = client.post("/suppliers", headers=auth(token_operador), json={"nome": "Primeiro", "cnpj": "45997418000153"}).json()
    assert client.delete(f"/suppliers/{primeiro['id']}", headers=auth(token_admin)).status_code == 204

    segundo = client.post("/suppliers", headers=auth(token_operador), json={"nome": "Segundo", "cnpj": "45.997.418/0001-53"})
    assert segundo.status_code == 201
    assert segundo.json()["cnpj"] == "45997418000153"


def test_put_da_conta_demo_conta_no_limite(client, db, fornecedor):
    """RN-56: o PUT entra no limite de alterações da conta de demonstração."""
    cabecalho = _cabecalho_demo(db)
    url = f"/suppliers/{fornecedor.id}"
    for numero in range(30):
        assert client.put(url, headers=cabecalho, json={"nome": f"Nome {numero}", "cnpj": None}).status_code == 200
    assert client.put(url, headers=cabecalho, json={"nome": "Nome 31", "cnpj": None}).status_code == 429
