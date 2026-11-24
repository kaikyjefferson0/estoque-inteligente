"""RN-61 a RN-64: ids da URL, caractere NUL, formato do 422 e teto do corpo (CT-95 a CT-98).

As tabelas abaixo são conferidas contra o OpenAPI da própria API: uma rota nova com id na URL, um
parâmetro de texto novo ou um campo de texto novo num corpo faz o teste falhar até entrar aqui.
"""

import asyncio
import json

import pytest
from fastapi import HTTPException
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.tamanho_corpo import MENSAGEM_CORPO_GRANDE, TETO_DO_CORPO, LimiteDoCorpo
from app.main import app
from app.models.product import Product
from app.models.supplier import Supplier
from app.schemas.comum import MAX_INTEGER, MENSAGEM_NUL
from tests.conftest import SENHA_ADMIN

NUL = "\x00"


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _openapi() -> dict:
    return app.openapi()


def _tem_texto(schema: dict) -> bool:
    """Texto direto ou opcional, e também lista e tipo referenciado (Enum, submodelo). Estes dois contam
    porque o validador da EntradaBase só olha o primeiro nível: um campo assim precisa entrar na tabela
    (e ganhar a proteção e um teste próprios) para o teste de cobertura passar."""
    if schema.get("type") == "string" or "$ref" in schema or "items" in schema:
        return True
    return any(_tem_texto(opcao) for chave in ("anyOf", "allOf", "oneOf") for opcao in schema.get(chave, []))


# --- CT-95: id fora do INTEGER na URL (RN-61) ---

# Corpo válido de cada rota com id, para o id ser o único problema da requisição
ROTAS_COM_ID = {
    ("GET", "/products/{produto_id}"): None,
    ("PATCH", "/products/{produto_id}"): {"nome": "Outro nome"},
    ("GET", "/products/{produto_id}/stock"): None,
    ("GET", "/products/{produto_id}/movements"): None,
    ("GET", "/suppliers/{fornecedor_id}"): None,
    ("PATCH", "/suppliers/{fornecedor_id}"): {"nome": "Outro nome"},
    ("PUT", "/suppliers/{fornecedor_id}"): {"nome": "Outro nome", "cnpj": None},
    ("DELETE", "/suppliers/{fornecedor_id}"): None,
    ("GET", "/users/{usuario_id}"): None,
    ("PATCH", "/users/{usuario_id}"): {"nome": "Outro nome"},
    ("POST", "/users/{usuario_id}/password"): {"senha_nova": "outra-senha-123"},
}


def _url_com_id(caminho: str, valor) -> str:
    inicio, _, resto = caminho.partition("{")
    return f"{inicio}{valor}{resto.partition('}')[2]}"


def _inteiros(schema: dict) -> list[dict]:
    if schema.get("type") == "integer":
        return [schema]
    return [opcao for opcao in schema.get("anyOf", []) if opcao.get("type") == "integer"]


def test_ct95_toda_rota_com_id_esta_na_tabela_e_no_limite_do_integer():
    rotas = set()
    for caminho, operacoes in _openapi()["paths"].items():
        for metodo, operacao in operacoes.items():
            for parametro in operacao.get("parameters", []):
                for inteiro in _inteiros(parametro["schema"]):
                    # Todo inteiro da URL (caminho ou query) tem teto que cabe no INTEGER do banco
                    assert inteiro.get("maximum", MAX_INTEGER + 1) <= MAX_INTEGER, (metodo, caminho, parametro["name"])
                    if parametro["in"] == "path":
                        rotas.add((metodo.upper(), caminho))
                        assert inteiro["minimum"] == 1, (metodo, caminho)
                        assert inteiro["maximum"] == MAX_INTEGER, (metodo, caminho)
    assert rotas == set(ROTAS_COM_ID)


@pytest.mark.parametrize(
    ("caminho", "parametro", "valor"),
    [
        ("/products", "deslocamento", MAX_INTEGER + 1),
        ("/products", "deslocamento", -1),
        ("/alerts", "produto_id", MAX_INTEGER + 1),
        ("/alerts", "produto_id", 0),
    ],
)
def test_ct95_inteiro_da_query_fora_da_faixa_e_422(client, token_admin, caminho, parametro, valor):
    response = client.get(caminho, params={parametro: valor}, headers=auth(token_admin))
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["query", parametro]


def test_ct95_inteiro_da_query_no_limite_responde(client, token_admin):
    assert client.get("/products", params={"deslocamento": MAX_INTEGER}, headers=auth(token_admin)).status_code == 200
    assert client.get("/alerts", params={"produto_id": MAX_INTEGER}, headers=auth(token_admin)).status_code == 200


@pytest.mark.parametrize(("metodo", "caminho"), list(ROTAS_COM_ID))
@pytest.mark.parametrize("valor", [0, -1, MAX_INTEGER + 1, 99999999999])
def test_ct95_id_fora_da_faixa_e_422(client, token_admin, metodo, caminho, valor):
    corpo = ROTAS_COM_ID[(metodo, caminho)]
    response = client.request(metodo, _url_com_id(caminho, valor), json=corpo, headers=auth(token_admin))
    assert response.status_code == 422
    (erro,) = response.json()["detail"]
    nome_do_id = caminho.partition("{")[2].partition("}")[0]
    assert erro["loc"] == ["path", nome_do_id]


@pytest.mark.parametrize(("metodo", "caminho"), list(ROTAS_COM_ID))
def test_ct95_maior_id_do_integer_que_nao_existe_e_404(client, token_admin, metodo, caminho):
    corpo = ROTAS_COM_ID[(metodo, caminho)]
    response = client.request(metodo, _url_com_id(caminho, MAX_INTEGER), json=corpo, headers=auth(token_admin))
    assert response.status_code == 404


def test_ct95_id_texto_continua_422(client, token_admin):
    response = client.get("/products/abc", headers=auth(token_admin))
    assert response.status_code == 422


# --- CT-96: caractere NUL em todo texto de entrada (RN-62) ---


@pytest.fixture
def contexto(refrigerante, fornecedor, operador):
    """Ids reais para as rotas com id: o NUL tem de ser o único problema."""
    return {"produto_id": refrigerante.id, "fornecedor_id": fornecedor.id, "usuario_id": operador.id}


# Corpo válido de cada rota com corpo; o teste troca um campo de texto por um valor com NUL
CORPOS = {
    ("POST", "/auth/login"): {"username": "admin@teste.com", "password": SENHA_ADMIN},
    ("POST", "/auth/change-password"): {"senha_atual": SENHA_ADMIN, "senha_nova": "senha-nova-123"},
    ("POST", "/users"): {"nome": "Novo", "email": "novo@teste.com", "senha": "senha-nova-123", "perfil": "operador"},
    ("PATCH", "/users/{usuario_id}"): {"nome": "Outro", "perfil": "operador"},
    ("POST", "/users/{usuario_id}/password"): {"senha_nova": "senha-nova-123"},
    ("POST", "/suppliers"): {"nome": "Fornecedor novo", "cnpj": "11444777000161"},
    ("PATCH", "/suppliers/{fornecedor_id}"): {"nome": "Outro", "cnpj": "11444777000161"},
    ("PUT", "/suppliers/{fornecedor_id}"): {"nome": "Outro", "cnpj": "11444777000161"},
    ("POST", "/products"): {"nome": "Produto novo", "codigo_barras": "7891000000099", "estoque_minimo": 1, "preco": "1.50"},
    ("PATCH", "/products/{produto_id}"): {"nome": "Outro", "codigo_barras": "7891000000098", "preco": "2.00"},
    ("POST", "/stock/entries"): {"codigo_barras": "7891000000001", "quantidade": 1, "validade": "2099-01-01"},
    ("POST", "/stock/exits"): {"codigo_barras": "7891000000001", "quantidade": 1},
    ("POST", "/stock/adjustments"): {"lote_id": 1, "saldo_contado": 1, "motivo": "Contagem"},
}
CAMPOS_COM_NUL = [(metodo, caminho, campo) for (metodo, caminho), corpo in CORPOS.items() for campo in corpo if isinstance(corpo[campo], str)]

# Textos que vêm na URL (busca das listas e código de barras exato); os Literal (tipo, situacao) também
PARAMETROS_DE_TEXTO = {
    ("GET", "/products", "busca"),
    ("GET", "/suppliers", "busca"),
    ("GET", "/stock", "busca"),
    ("GET", "/stock", "situacao"),
    ("GET", "/alerts", "tipo"),
    ("GET", "/products/by-barcode/{codigo_barras}", "codigo_barras"),
}


def test_ct96_todo_campo_de_texto_esta_na_tabela():
    """Um campo de texto novo num corpo, ou um parâmetro de texto novo, precisa entrar nas tabelas."""
    esquemas = _openapi()["components"]["schemas"]
    campos, parametros = set(), set()
    for caminho, operacoes in _openapi()["paths"].items():
        for metodo, operacao in operacoes.items():
            for parametro in operacao.get("parameters", []):
                if _tem_texto(parametro["schema"]):
                    parametros.add((metodo.upper(), caminho, parametro["name"]))
            for conteudo in operacao.get("requestBody", {}).get("content", {}).values():
                nome = conteudo["schema"]["$ref"].rsplit("/", 1)[-1]
                for campo, esquema in esquemas[nome]["properties"].items():
                    if _tem_texto(esquema):
                        campos.add((metodo.upper(), caminho, campo))
    assert campos == set(CAMPOS_COM_NUL)
    assert parametros == PARAMETROS_DE_TEXTO


def _assert_recusou_nul(response, loc: list) -> None:
    assert response.status_code == 422, response.text
    erros = [erro for erro in response.json()["detail"] if erro["loc"] == loc]
    assert erros == [{"loc": loc, "msg": MENSAGEM_NUL, "type": "texto_com_nul"}]


@pytest.mark.parametrize("posicao", ["inicio", "meio", "fim"])
@pytest.mark.parametrize(("metodo", "caminho", "campo"), CAMPOS_COM_NUL)
def test_ct96_nul_em_campo_de_texto_e_422(client, token_admin, contexto, metodo, caminho, campo, posicao):
    corpo = dict(CORPOS[(metodo, caminho)])
    valor = corpo[campo]
    corpo[campo] = {"inicio": NUL + valor, "meio": valor[:2] + NUL + valor[2:], "fim": valor + NUL}[posicao]
    url = caminho.format(**contexto)
    if caminho == "/auth/login":
        response = client.post(url, data=corpo)
    else:
        response = client.request(metodo, url, json=corpo, headers=auth(token_admin))
    _assert_recusou_nul(response, ["body", campo])


@pytest.mark.parametrize(("metodo", "caminho", "parametro"), sorted(PARAMETROS_DE_TEXTO))
def test_ct96_nul_em_parametro_da_url_e_422(client, token_admin, metodo, caminho, parametro):
    if "{" in caminho:
        response = client.request(metodo, caminho.replace("{codigo_barras}", "789%00100"), headers=auth(token_admin))
        local = "path"
    else:
        response = client.request(metodo, caminho, params={parametro: f"leite{NUL}"}, headers=auth(token_admin))
        local = "query"
    if parametro in ("tipo", "situacao"):
        # Literal: o valor com NUL não é nenhuma das opções e já era 422
        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == [local, parametro]
    else:
        _assert_recusou_nul(response, [local, parametro])


def test_ct96_nul_nao_grava_nada(client, token_admin, db, refrigerante):
    total_antes = db.query(Supplier).count()
    response = client.post("/suppliers", json={"nome": f"Distribuidora{NUL}"}, headers=auth(token_admin))
    assert response.status_code == 422
    assert db.query(Supplier).count() == total_antes

    response = client.patch(f"/products/{refrigerante.id}", json={"nome": f"Outro{NUL}"}, headers=auth(token_admin))
    assert response.status_code == 422
    db.expire_all()
    assert db.get(Product, refrigerante.id).nome == "Refrigerante 2L"


def test_ct96_surrogate_solto_no_json_e_422(client, token_admin):
    """Parecido com o NUL: "\\ud800" sozinho não vira UTF-8 e não pode chegar ao banco."""
    cabecalhos = auth(token_admin) | {"Content-Type": "application/json"}
    response = client.post("/suppliers", content=rb'{"nome": "Distribuidora \ud800"}', headers=cabecalhos)
    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "nome"]


def test_ct96_texto_sem_nul_continua_aceito(client, token_admin):
    """Só o NUL é recusado: nome com espaço inseparável e busca com espaço continuam valendo."""
    response = client.post("/suppliers", json={"nome": "Distribuidora Sul"}, headers=auth(token_admin))
    assert response.status_code == 201
    response = client.get("/products", params={"busca": "leite integral"}, headers=auth(token_admin))
    assert response.status_code == 200


# --- CT-97: o 422 nunca devolve o valor recebido (RN-63) ---

SEGREDO = "Segr3d0!"  # 8 caracteres; os testes o encurtam ou o mandam em lugar errado


def _assert_sem_valor_recebido(response, *segredos: str) -> None:
    assert response.status_code == 422, response.text
    corpo = response.json()
    assert list(corpo) == ["detail"]
    assert corpo["detail"], "o 422 precisa dizer qual campo errou"
    for erro in corpo["detail"]:
        assert set(erro) == {"loc", "msg", "type"}
        assert isinstance(erro["loc"], list) and erro["msg"] and erro["type"]
    for segredo in segredos:
        assert segredo not in response.text


def test_ct97_login_sem_email_nao_devolve_a_senha(client):
    # Campo faltando: o "input" padrão seria o formulário inteiro, com a senha
    _assert_sem_valor_recebido(client.post("/auth/login", data={"password": SEGREDO}), SEGREDO)
    _assert_sem_valor_recebido(client.post("/auth/login", data={"username": "a@b.com", "password": SEGREDO + NUL}), SEGREDO)


def test_ct97_troca_de_senha_nao_devolve_as_senhas(client, token_admin):
    corpo = {"senha_atual": SEGREDO, "senha_nova": SEGREDO[:7], "extra": SEGREDO + "x"}
    _assert_sem_valor_recebido(client.post("/auth/change-password", json=corpo, headers=auth(token_admin)), SEGREDO, SEGREDO[:7])


def test_ct97_cadastro_de_usuario_nao_devolve_a_senha(client, token_admin):
    corpo = {"nome": "Novo", "email": "novo@teste.com", "senha": SEGREDO[:7], "perfil": "chefe"}
    response = client.post("/users", json=corpo, headers=auth(token_admin))
    _assert_sem_valor_recebido(response, SEGREDO[:7], "chefe")
    assert {tuple(erro["loc"]) for erro in response.json()["detail"]} == {("body", "senha"), ("body", "perfil")}


def test_ct97_admin_define_senha_nao_devolve_a_senha(client, token_admin, operador):
    response = client.post(f"/users/{operador.id}/password", json={"senha_nova": SEGREDO * 20}, headers=auth(token_admin))
    _assert_sem_valor_recebido(response, SEGREDO)


def test_ct97_outros_422_tambem_sem_input_e_ctx(client, token_admin, refrigerante):
    cabecalhos = auth(token_admin) | {"Content-Type": "application/json"}
    respostas = [
        client.post("/suppliers", content=b'{"nome": "segredo-quebrado', headers=cabecalhos),  # JSON inválido
        client.get("/products", params={"limite": 999}, headers=auth(token_admin)),  # ctx com o limite
        client.get(f"/products/{MAX_INTEGER + 1}", headers=auth(token_admin)),
        client.patch(f"/products/{refrigerante.id}", json={"nome": None}, headers=auth(token_admin)),  # model_validator
        client.post("/products", json={"nome": "X", "codigo_barras": "1", "estoque_minimo": 1, "preco": 12.5}, headers=auth(token_admin)),
    ]
    for response in respostas:
        _assert_sem_valor_recebido(response, "segredo-quebrado")


def test_ct97_erro_de_campo_continua_no_formato_que_a_tela_le(client, token_admin):
    """O frontend (api/client.ts) marca o campo pelo loc, sem o "body", e mostra o msg."""
    response = client.post("/suppliers", json={"nome": "  "}, headers=auth(token_admin))
    (erro,) = response.json()["detail"]
    assert erro["loc"] == ["body", "nome"]
    assert erro["type"] == "string_too_short"


# --- CT-98: corpo acima do teto (RN-64) ---


def _corpo_com_tamanho(base: dict, tamanho: int) -> bytes:
    """JSON válido com exatamente `tamanho` bytes (espaços no fim, que o JSON ignora)."""
    texto = json.dumps(base).encode()
    assert len(texto) <= tamanho
    return texto + b" " * (tamanho - len(texto))


PRODUTO = {"nome": "Produto do teto", "codigo_barras": "7891000000777", "estoque_minimo": 1}


def test_ct98_corpo_no_teto_e_aceito(client, token_admin):
    corpo = _corpo_com_tamanho(PRODUTO, TETO_DO_CORPO)
    response = client.post("/products", content=corpo, headers=auth(token_admin) | {"Content-Type": "application/json"})
    assert response.status_code == 201


def test_ct98_corpo_acima_do_teto_e_413_sem_gravar(client, token_admin, db):
    corpo = _corpo_com_tamanho(PRODUTO, TETO_DO_CORPO + 1)
    response = client.post("/products", content=corpo, headers=auth(token_admin) | {"Content-Type": "application/json"})
    assert response.status_code == 413
    assert response.json() == {"detail": MENSAGEM_CORPO_GRANDE}
    assert db.query(Product).filter_by(codigo_barras=PRODUTO["codigo_barras"]).count() == 0


def test_ct98_corpo_em_partes_sem_content_length_e_413(client, token_admin, db):
    """Envio em partes (chunked): a API conta os bytes à medida que chegam."""
    corpo = _corpo_com_tamanho(PRODUTO, TETO_DO_CORPO + 1)

    def partes():
        for inicio in range(0, len(corpo), 4096):
            yield corpo[inicio : inicio + 4096]

    response = client.post("/products", content=partes(), headers=auth(token_admin) | {"Content-Type": "application/json"})
    assert "content-length" not in {nome.lower() for nome in response.request.headers}
    assert response.status_code == 413
    assert response.json() == {"detail": MENSAGEM_CORPO_GRANDE}
    assert db.query(Product).filter_by(codigo_barras=PRODUTO["codigo_barras"]).count() == 0


def test_ct98_login_com_senha_enorme_e_413(client):
    response = client.post("/auth/login", data={"username": "admin@teste.com", "password": "x" * TETO_DO_CORPO})
    assert response.status_code == 413


def test_ct98_413_sai_com_cors_e_cabecalhos_de_seguranca(client, token_admin):
    """A tela precisa ler a mensagem: o 413 passa pelo CORS como as outras respostas."""
    origem = settings.CORS_ORIGINS[0]
    corpo = _corpo_com_tamanho(PRODUTO, TETO_DO_CORPO + 1)
    cabecalhos = auth(token_admin) | {"Content-Type": "application/json", "Origin": origem}
    response = client.post("/products", content=corpo, headers=cabecalhos)
    assert response.status_code == 413
    assert response.headers["access-control-allow-origin"] == origem
    assert response.headers["x-content-type-options"] == "nosniff"


@pytest.mark.parametrize("tipo", ["urlencoded", "multipart"])
def test_ct98_login_em_partes_acima_do_teto_e_413(client, tipo):
    """Sem Content-Length, o 413 sai de dentro da leitura do formulário (request.form())."""
    if tipo == "urlencoded":
        corpo = b"username=admin%40teste.com&password=" + b"x" * TETO_DO_CORPO
        content_type = "application/x-www-form-urlencoded"
    else:
        corpo = (
            b'--limite\r\nContent-Disposition: form-data; name="username"\r\n\r\nadmin@teste.com\r\n'
            b'--limite\r\nContent-Disposition: form-data; name="password"\r\n\r\n'
            + b"x" * TETO_DO_CORPO
            + b"\r\n--limite--\r\n"
        )
        content_type = "multipart/form-data; boundary=limite"

    def partes():
        for inicio in range(0, len(corpo), 8192):
            yield corpo[inicio : inicio + 8192]

    response = client.post("/auth/login", content=partes(), headers={"Content-Type": content_type})
    assert response.status_code == 413
    assert response.json() == {"detail": MENSAGEM_CORPO_GRANDE}


# Teste de unidade do LimiteDoCorpo: o TestClient junta o corpo numa mensagem só, então aqui as
# mensagens do ASGI são montadas à mão para provar quando a leitura para.

PEDACO = 30 * 1024


def _rodar_limite(mensagens: list[dict], cabecalhos: list[tuple[bytes, bytes]]):
    lidas, enviadas, app_chamado = [], [], []
    fila = list(mensagens)

    async def receive():
        lidas.append(1)
        return fila.pop(0)

    async def send(mensagem):
        enviadas.append(mensagem)

    async def app_interno(scope, receive, send):
        app_chamado.append(True)
        while (await receive()).get("more_body"):
            pass
        await JSONResponse({"ok": True})(scope, receive, send)

    scope = {"type": "http", "method": "POST", "path": "/products", "headers": cabecalhos}
    erro = None
    try:
        asyncio.run(LimiteDoCorpo(app_interno)(scope, receive, send))
    except HTTPException as excecao:
        erro = excecao
    return erro, len(lidas), enviadas, bool(app_chamado)


def test_ct98_leitura_para_no_pedaco_que_passa_do_teto():
    # 4 pedaços de 30 KB: o 3º leva a 90 KB; o 4º nunca é lido
    mensagens = [{"type": "http.request", "body": b"x" * PEDACO, "more_body": True} for _ in range(4)]
    erro, lidas, enviadas, _ = _rodar_limite(mensagens, [])
    assert erro is not None and erro.status_code == 413
    assert lidas == 3
    assert enviadas == []  # a resposta 413 sai pelo tratamento de erros do FastAPI


def test_ct98_content_length_acima_do_teto_nao_le_nada():
    mensagens = [{"type": "http.request", "body": b"x" * PEDACO, "more_body": True}]
    cabecalhos = [(b"content-length", str(TETO_DO_CORPO + 1).encode())]
    erro, lidas, enviadas, app_chamado = _rodar_limite(mensagens, cabecalhos)
    assert erro is None
    assert lidas == 0 and not app_chamado
    assert enviadas[0]["status"] == 413
    assert json.loads(enviadas[1]["body"]) == {"detail": MENSAGEM_CORPO_GRANDE}


def test_ct98_corpo_no_teto_em_partes_passa_inteiro():
    mensagens = [
        {"type": "http.request", "body": b"x" * (TETO_DO_CORPO - 10), "more_body": True},
        {"type": "http.request", "body": b"x" * 10, "more_body": False},
    ]
    erro, lidas, enviadas, app_chamado = _rodar_limite(mensagens, [])
    assert erro is None and app_chamado and lidas == 2
    assert enviadas[0]["status"] == 200
