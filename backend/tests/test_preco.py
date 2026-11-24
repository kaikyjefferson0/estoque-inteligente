"""CT-91 e CT-92 / RN-60: preço do produto em NUMERIC(10,2), opcional e nunca negativo.
(O CT-93, da migration, fica em test_migracao_preco.py.)

O preço trafega como texto ("79.90") e vira Decimal no schema; em nenhum ponto passa por float.
"""

from decimal import Decimal

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DataError, IntegrityError

from app.models.product import Product

RESTRICAO = "ck_products_preco_nao_negativo"


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def dados_detergente(**alteracoes) -> dict:
    dados = {"nome": "Detergente neutro 500 ml", "codigo_barras": "7891000000102", "estoque_minimo": 5}
    dados.update(alteracoes)
    return dados


def preco_gravado(db, produto_id: int) -> Decimal | None:
    return db.execute(text("SELECT preco FROM products WHERE id = :id"), {"id": produto_id}).scalar_one()


def inserir_direto(db, codigo: str, preco) -> int:
    """INSERT em SQL, fora da API e do ORM; o preço vai como texto, como num psql."""
    return db.execute(
        text(
            "INSERT INTO products (nome, codigo_barras, estoque_minimo, preco)"
            " VALUES ('Fora da API', :codigo, 0, CAST(:preco AS numeric)) RETURNING id"
        ),
        {"codigo": codigo, "preco": preco},
    ).scalar_one()


# --- CT-91: valores-limite pela API ---


@pytest.mark.parametrize(
    ("enviado", "devolvido"),
    [
        ("0", "0.00"),
        ("0.01", "0.01"),
        ("99999999.99", "99999999.99"),
        ("12.5", "12.50"),
        ("79.90", "79.90"),
        ("007.50", "7.50"),
        (None, None),
    ],
    ids=["zero", "um-centavo", "maximo", "uma-casa", "duas-casas", "zeros-a-esquerda", "nulo"],
)
def test_ct91_cadastro_aceita_preco_nos_limites(client, db, token_operador, enviado, devolvido):
    resposta = client.post("/products", headers=auth(token_operador), json=dados_detergente(preco=enviado))
    assert resposta.status_code == 201, resposta.text
    produto = resposta.json()
    assert produto["preco"] == devolvido  # texto com 2 casas, nunca número
    esperado = None if devolvido is None else Decimal(devolvido)
    assert preco_gravado(db, produto["id"]) == esperado


@pytest.mark.parametrize(
    ("enviado", "tipo"),
    [
        ("-0.01", "preco_negativo"),
        ("-1", "preco_negativo"),
        ("-0", "preco_negativo"),
        ("100000000.00", "preco_maximo"),
        ("100000000", "preco_maximo"),
        ("12.345", "preco_casas"),
        ("0.001", "preco_casas"),
        ("12.340", "preco_casas"),  # 3 casas escritas, mesmo terminando em zero
        ("12,50", "preco_formato"),
        ("abc", "preco_formato"),
        ("", "preco_formato"),
        ("NaN", "preco_formato"),
        ("Infinity", "preco_formato"),
        ("1e2", "preco_formato"),
        ("1_000.50", "preco_formato"),
        (" 5 ", "preco_formato"),
        ("12.", "preco_formato"),
        ("+5", "preco_formato"),
        (chr(0x0661) + chr(0x0662), "preco_formato"),  # dígitos arábicos, que o Decimal aceitaria
        (True, "preco_texto"),
        (79, "preco_texto"),
        (0.1, "preco_texto"),
    ],
    ids=[
        "negativo",
        "negativo-inteiro",
        "menos-zero",
        "acima-do-maximo",
        "acima-do-maximo-inteiro",
        "tres-casas",
        "milesimo",
        "tres-casas-com-zero",
        "virgula",
        "texto",
        "vazio",
        "nan",
        "infinito",
        "notacao-cientifica",
        "sublinhado",
        "espacos",
        "ponto-sem-casas",
        "sinal-de-mais",
        "digitos-nao-ascii",
        "booleano",
        "numero-inteiro-json",
        "numero-json",
    ],
)
def test_ct91_cadastro_recusa_preco_invalido(client, db, token_admin, enviado, tipo):
    resposta = client.post("/products", headers=auth(token_admin), json=dados_detergente(preco=enviado))
    assert resposta.status_code == 422
    assert [(erro["loc"], erro["type"]) for erro in resposta.json()["detail"]] == [(["body", "preco"], tipo)]
    assert db.query(Product).count() == 0


def test_ct91_numero_json_com_casas_demais_e_recusado_sem_virar_float(client, db, token_admin):
    """Número do JSON passa por float no json.loads do FastAPI: 12.5000000000000001 viraria 12.5 e seria
    gravado como 12,50. Por isso o preço só é aceito como texto."""
    corpo = '{"nome": "Detergente", "codigo_barras": "7891000000102", "estoque_minimo": 5, "preco": 12.5000000000000001}'
    resposta = client.post(
        "/products", headers={**auth(token_admin), "Content-Type": "application/json"}, content=corpo
    )
    assert resposta.status_code == 422
    assert resposta.json()["detail"][0]["type"] == "preco_texto"
    assert db.query(Product).count() == 0
    # O mesmo valor como texto também é recusado, agora pelas casas decimais
    resposta = client.post(
        "/products",
        headers=auth(token_admin),
        json=dados_detergente(preco="12.5000000000000001"),
    )
    assert resposta.json()["detail"][0]["type"] == "preco_casas"


def test_ct91_cadastro_sem_a_chave_preco_fica_sem_preco(client, db, token_admin):
    resposta = client.post("/products", headers=auth(token_admin), json=dados_detergente())
    assert resposta.status_code == 201
    assert resposta.json()["preco"] is None
    assert preco_gravado(db, resposta.json()["id"]) is None


def test_ct91_edicao_poe_troca_e_apaga_o_preco(client, db, token_operador, detergente):
    headers = auth(token_operador)
    url = f"/products/{detergente.id}"
    assert client.get(url, headers=headers).json()["preco"] is None

    resposta = client.patch(url, headers=headers, json={"preco": "12.50"})
    assert resposta.status_code == 200
    assert resposta.json()["preco"] == "12.50"

    # Editar outro campo não mexe no preço
    resposta = client.patch(url, headers=headers, json={"estoque_minimo": 7})
    assert resposta.json()["preco"] == "12.50"

    resposta = client.patch(url, headers=headers, json={"preco": "0.01"})
    assert resposta.json()["preco"] == "0.01"

    # null apaga o preço
    resposta = client.patch(url, headers=headers, json={"preco": None})
    assert resposta.status_code == 200
    assert resposta.json()["preco"] is None
    assert preco_gravado(db, detergente.id) is None


@pytest.mark.parametrize(("enviado", "devolvido"), [("0", "0.00"), ("0.01", "0.01"), ("99999999.99", "99999999.99")])
def test_ct91_edicao_aceita_preco_nos_limites(client, db, token_admin, detergente, enviado, devolvido):
    resposta = client.patch(f"/products/{detergente.id}", headers=auth(token_admin), json={"preco": enviado})
    assert resposta.status_code == 200
    assert resposta.json()["preco"] == devolvido
    assert preco_gravado(db, detergente.id) == Decimal(devolvido)


@pytest.mark.parametrize("enviado", ["-0.01", "100000000.00", "12.345", "12,50", 12.5])
def test_ct91_edicao_recusa_preco_invalido_sem_alterar(client, db, token_admin, detergente, enviado):
    headers = auth(token_admin)
    url = f"/products/{detergente.id}"
    assert client.patch(url, headers=headers, json={"preco": "79.90"}).status_code == 200

    resposta = client.patch(url, headers=headers, json={"preco": enviado, "estoque_minimo": 9})
    assert resposta.status_code == 422
    assert preco_gravado(db, detergente.id) == Decimal("79.90")
    assert client.get(url, headers=headers).json()["estoque_minimo"] == 5  # nada mudou


def test_ct91_preco_sai_como_texto_na_lista_no_detalhe_e_na_busca_por_codigo(client, token_admin, detergente):
    headers = auth(token_admin)
    client.patch(f"/products/{detergente.id}", headers=headers, json={"preco": "79.9"})

    detalhe = client.get(f"/products/{detergente.id}", headers=headers).json()
    lista = client.get("/products", headers=headers).json()["itens"]
    por_codigo = client.get(f"/products/by-barcode/{detergente.codigo_barras}", headers=headers).json()

    assert detalhe["preco"] == "79.90"
    assert [p["preco"] for p in lista if p["id"] == detergente.id] == ["79.90"]
    assert por_codigo["preco"] == "79.90"


# --- CT-92: o banco garante o preço, mesmo fora da API ---


@pytest.mark.parametrize("preco", ["-0.01", "-100"])
def test_ct92_banco_recusa_preco_negativo_fora_da_api(db, preco):
    with pytest.raises(IntegrityError) as erro:
        with db.begin_nested():
            inserir_direto(db, "7899999999901", preco)
    assert RESTRICAO in str(erro.value)


def test_ct92_banco_recusa_update_para_preco_negativo(db, detergente):
    with pytest.raises(IntegrityError) as erro:
        with db.begin_nested():
            db.execute(text("UPDATE products SET preco = -0.01 WHERE id = :id"), {"id": detergente.id})
    assert RESTRICAO in str(erro.value)


@pytest.mark.parametrize("preco", ["0", "0.01", "99999999.99", None])
def test_ct92_banco_aceita_zero_maximo_e_nulo(db, preco):
    produto_id = inserir_direto(db, "7899999999902", preco)
    assert preco_gravado(db, produto_id) == (None if preco is None else Decimal(preco))


def test_ct92_banco_recusa_preco_acima_de_numeric_10_2(db):
    """O limite da API (99.999.999,99) é o mesmo da coluna."""
    with pytest.raises(DataError) as erro:
        with db.begin_nested():
            inserir_direto(db, "7899999999903", "100000000.00")
    assert erro.value.orig.sqlstate == "22003"  # numeric_value_out_of_range (a mensagem muda com o idioma)


def test_ct92_soma_de_precos_e_exata(db):
    """O motivo do NUMERIC: 0,10 + 0,20 dá exatamente 0,30, o que float não garante."""
    assert 0.1 + 0.2 != 0.3  # o problema que o NUMERIC evita
    ids = [inserir_direto(db, "7899999999904", "0.10"), inserir_direto(db, "7899999999905", "0.20")]

    soma = db.execute(text("SELECT SUM(preco) FROM products WHERE id = ANY(:ids)"), {"ids": ids}).scalar_one()

    assert isinstance(soma, Decimal)
    assert soma == Decimal("0.30")
    assert str(soma) == "0.30"
    # A comparação também é exata dentro do banco
    assert db.execute(text("SELECT SUM(preco) = 0.30 FROM products WHERE id = ANY(:ids)"), {"ids": ids}).scalar_one()
    # E o model devolve Decimal, nunca float
    precos = [db.get(Product, produto_id).preco for produto_id in ids]
    assert precos == [Decimal("0.10"), Decimal("0.20")]
    assert sum(precos) == Decimal("0.30")
