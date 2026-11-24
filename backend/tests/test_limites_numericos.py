"""CT-99, CT-101 e CT-102: nenhum número que a API aceita estoura uma conta no banco (RN-26 e RN-65).
(O CT-100, da migration, fica em test_migracao_dias_alerta.py; a disputa do CT-101, em test_concorrencia.py.)
"""

from datetime import date, timedelta

import pytest
from sqlalchemy import func, select

from app.models.alert import Alert
from app.models.batch import Batch
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.schemas.comum import MAX_INTEGER
from app.schemas.products import MENSAGEM_DIAS_ALERTA
from app.services import condicoes
from app.services import products as service_produtos
from app.services import stock as service


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def em_dias(dias: int) -> str:
    return (service.hoje() + timedelta(days=dias)).isoformat()


def dados_leite(**alteracoes) -> dict:
    return {
        "nome": "Leite integral 1 L",
        "codigo_barras": "7891000000501",
        "estoque_minimo": 5,
        "controla_validade": True,
        "dias_alerta_validade": 30,
    } | alteracoes


def entrada(client, token, codigo_barras, quantidade, validade=None):
    dados = {"codigo_barras": codigo_barras, "quantidade": quantidade, "validade": validade}
    return client.post("/stock/entries", headers=auth(token), json=dados)


def saida(client, token, codigo_barras, quantidade):
    dados = {"codigo_barras": codigo_barras, "quantidade": quantidade}
    return client.post("/stock/exits", headers=auth(token), json=dados)


def ajuste(client, token, lote_id, contado):
    dados = {"lote_id": lote_id, "saldo_contado": contado, "motivo": "contagem do inventário"}
    return client.post("/stock/adjustments", headers=auth(token), json=dados)


def retrato(db) -> tuple:
    """Tudo o que está gravado: igual antes e depois quando nada foi gravado."""
    db.expire_all()
    return tuple(
        tuple(db.execute(select(*modelo.__table__.columns).order_by(modelo.id)).all())
        for modelo in (Product, Batch, StockMovement, Alert)
    )


# --- CT-99: dias de alerta de 1 a 3650 ---


@pytest.mark.parametrize("dias", [1, 3650])
def test_ct99_cadastro_e_edicao_aceitam_os_limites(client, token_operador, refrigerante, dias):
    criado = client.post("/products", headers=auth(token_operador), json=dados_leite(dias_alerta_validade=dias))
    assert criado.status_code == 201
    assert criado.json()["dias_alerta_validade"] == dias

    editado = client.patch(
        f"/products/{refrigerante.id}", headers=auth(token_operador), json={"dias_alerta_validade": dias}
    )
    assert editado.status_code == 200
    assert editado.json()["dias_alerta_validade"] == dias


@pytest.mark.parametrize("dias", [-MAX_INTEGER, -1, 0, 3651, MAX_INTEGER, MAX_INTEGER + 1, 10**30])
def test_ct99_cadastro_e_edicao_recusam_fora_da_faixa(client, db, token_operador, refrigerante, dias):
    """422 no campo, com o limite na mensagem, e nada gravado. 2147483647 era erro do servidor (500)."""
    antes = retrato(db)
    criar = client.post("/products", headers=auth(token_operador), json=dados_leite(dias_alerta_validade=dias))
    editar = client.patch(
        f"/products/{refrigerante.id}", headers=auth(token_operador), json={"dias_alerta_validade": dias}
    )
    for resposta in (criar, editar):
        assert resposta.status_code == 422
        assert resposta.json()["detail"] == [
            {"loc": ["body", "dias_alerta_validade"], "msg": MENSAGEM_DIAS_ALERTA, "type": "dias_alerta_fora_da_faixa"}
        ]
    assert MENSAGEM_DIAS_ALERTA == "Informe de 1 a 3650 dias de alerta (no máximo 10 anos)."
    assert retrato(db) == antes


@pytest.mark.parametrize("dias", [-1, 0, 3651])
def test_ct99_service_tambem_recusa(db, refrigerante, dias):
    """Quem chama o service sem passar pelo schema (a demo, um script) tem a mesma recusa."""
    antes = retrato(db)
    with pytest.raises(service_produtos.DiasAlertaInvalidoError, match="de 1 a 3650"):
        service_produtos.criar_produto(db, **dados_leite(dias_alerta_validade=dias))
    with pytest.raises(service_produtos.DiasAlertaInvalidoError, match="de 1 a 3650"):
        service_produtos.atualizar_produto(db, refrigerante.id, {"dias_alerta_validade": dias})
    assert retrato(db) == antes


def test_ct99_openapi_anuncia_a_faixa(client):
    esquemas = client.get("/openapi.json").json()["components"]["schemas"]
    for nome in ("ProductCreate", "ProductUpdate"):
        campo = esquemas[nome]["properties"]["dias_alerta_validade"]
        assert {"type": "integer", "minimum": 1, "maximum": 3650} in campo["anyOf"]


def test_ct99_alertas_com_o_teto_e_a_maior_validade(client, token_operador):
    """RN-14: hoje + 3650 dias no limite do alerta, e a maior data que a API aceita, sem erro."""
    criado = client.post("/products", headers=auth(token_operador), json=dados_leite(dias_alerta_validade=3650))
    produto = criado.json()
    for validade in (em_dias(3650), em_dias(3651), date.max.isoformat()):
        assert entrada(client, token_operador, produto["codigo_barras"], 10, validade).status_code == 201

    lotes = client.get(f"/products/{produto['id']}/stock", headers=auth(token_operador)).json()["lotes"]
    assert [lote["situacao"] for lote in lotes] == ["a_vencer", "ok", "ok"]
    # RN-40: só o lote do limite está em alerta, e a geração completa não muda nada
    for _ in range(2):
        alertas = client.get("/alerts", headers=auth(token_operador)).json()["itens"]
        assert [(a["tipo"], a["lote_id"]) for a in alertas] == [("vencimento_proximo", lotes[0]["id"])]
        geracao = client.post("/alerts/generate", headers=auth(token_operador))
        assert geracao.status_code == 200
        assert geracao.json() == {"criados": 0, "resolvidos": 0}


# --- CT-101: entrada que passaria do máximo do lote ---


def test_ct101_entrada_deixa_o_lote_exatamente_no_maximo(client, token_operador, detergente, refrigerante):
    codigo = detergente.codigo_barras
    assert entrada(client, token_operador, codigo, 2_000_000_000).status_code == 201
    resposta = entrada(client, token_operador, codigo, 147_483_647)
    assert resposta.status_code == 201
    assert resposta.json()["quantidade_lote"] == MAX_INTEGER
    assert resposta.json()["saldo_total"] == MAX_INTEGER

    # Uma entrada só, do tamanho do máximo, também cabe num lote novo
    resposta = entrada(client, token_operador, refrigerante.codigo_barras, MAX_INTEGER, em_dias(60))
    assert resposta.status_code == 201
    assert resposta.json()["quantidade_lote"] == MAX_INTEGER


CABEM_147_483_647 = (
    "O lote tem 2000000000 unidades e vai até 2147483647: cabem mais 147483647 unidades. Informe até 147483647."
)


@pytest.mark.parametrize(
    ("ja_tem", "pedido", "mensagem"),
    [
        (2_000_000_000, 147_483_648, CABEM_147_483_647),
        (2_000_000_000, 2_000_000_000, CABEM_147_483_647),
        (
            MAX_INTEGER - 1,
            2,
            "O lote tem 2147483646 unidades e vai até 2147483647: cabe mais 1 unidade. Informe até 1.",
        ),
        (
            MAX_INTEGER,
            1,
            "O lote já tem 2147483647 unidades, o máximo de um lote, e não cabe mais nenhuma."
            " Confira a quantidade e o saldo do lote.",
        ),
        (
            1,
            MAX_INTEGER,
            "O lote tem 1 unidade e vai até 2147483647: cabem mais 2147483646 unidades. Informe até 2147483646.",
        ),
    ],
    ids=["uma-a-mais", "soma-muito-maior", "cabe-uma", "lote-cheio", "pedido-maximo"],
)
@pytest.mark.parametrize("com_validade", [False, True], ids=["sem-validade", "com-validade"])
def test_ct101_entrada_acima_do_maximo_e_recusada_sem_gravar_nada(
    client, db, token_operador, detergente, refrigerante, com_validade, ja_tem, pedido, mensagem
):
    codigo, validade = (refrigerante.codigo_barras, em_dias(60)) if com_validade else (detergente.codigo_barras, None)
    assert entrada(client, token_operador, codigo, ja_tem, validade).status_code == 201
    antes = retrato(db)

    resposta = entrada(client, token_operador, codigo, pedido, validade)

    assert resposta.status_code == 422
    assert resposta.json() == {"detail": mensagem}
    # A tela põe a mensagem no campo da quantidade, a menos que o texto fale da validade
    # (EntradaPage, que não diferencia maiúsculas; ver EntradaPage.test.tsx)
    assert "validade" not in mensagem.lower()
    assert retrato(db) == antes


def test_ct101_o_maximo_e_por_lote_e_a_saida_abre_espaco(client, token_operador, refrigerante):
    """RN-28: cada validade tem o seu lote."""
    codigo = refrigerante.codigo_barras
    assert entrada(client, token_operador, codigo, MAX_INTEGER, em_dias(60)).status_code == 201
    assert entrada(client, token_operador, codigo, 1, em_dias(60)).status_code == 422
    assert entrada(client, token_operador, codigo, 1, em_dias(90)).status_code == 201

    assert saida(client, token_operador, codigo, 1).status_code == 201
    resposta = entrada(client, token_operador, codigo, 1, em_dias(60))
    assert resposta.status_code == 201
    assert resposta.json()["quantidade_lote"] == MAX_INTEGER


def test_ct101_service_recusa_quantidade_acima_do_maximo(db, operador, detergente):
    """Sem passar pelo schema, o lote recém-criado é desfeito junto com a entrada recusada."""
    antes = retrato(db)
    with pytest.raises(service.LoteCheioError, match="Informe até 2147483647"):
        service.registrar_entrada(db, operador, detergente.codigo_barras, MAX_INTEGER + 1)
    assert retrato(db) == antes


# --- CT-102: as outras contas com INTEGER ---


def test_ct102_ajuste_vai_de_um_extremo_ao_outro(client, db, token_admin, detergente):
    """saldo_anterior, saldo_novo e a diferença cabem no INTEGER nos dois extremos."""
    lote_id = entrada(client, token_admin, detergente.codigo_barras, MAX_INTEGER).json()["lote_id"]

    zerar = ajuste(client, token_admin, lote_id, 0)
    assert zerar.status_code == 201
    assert [zerar.json()[c] for c in ("quantidade", "saldo_anterior", "saldo_novo")] == [-MAX_INTEGER, MAX_INTEGER, 0]

    encher = ajuste(client, token_admin, lote_id, MAX_INTEGER)
    assert encher.status_code == 201
    assert [encher.json()[c] for c in ("quantidade", "saldo_anterior", "saldo_novo")] == [MAX_INTEGER, 0, MAX_INTEGER]
    assert encher.json()["saldo_total"] == MAX_INTEGER

    antes = retrato(db)
    assert ajuste(client, token_admin, lote_id, MAX_INTEGER + 1).status_code == 422
    assert retrato(db) == antes


def test_ct102_service_do_ajuste_recusa_acima_do_maximo(client, db, admin, token_admin, detergente):
    lote_id = entrada(client, token_admin, detergente.codigo_barras, 5).json()["lote_id"]
    antes = retrato(db)
    with pytest.raises(service.QuantidadeInvalidaError, match="2147483647"):
        service.registrar_ajuste(db, admin, lote_id, MAX_INTEGER + 1, "contagem do inventário")
    assert retrato(db) == antes


@pytest.fixture
def dois_lotes_cheios(client, token_admin, refrigerante):
    """Dois lotes no máximo: o saldo do produto é o dobro do que cabe num INTEGER."""
    for dias in (10, 60):
        assert entrada(client, token_admin, refrigerante.codigo_barras, MAX_INTEGER, em_dias(dias)).status_code == 201
    return refrigerante


def test_ct102_soma_do_saldo_do_produto_passa_do_integer(client, token_admin, dois_lotes_cheios):
    """Detalhe, lista de estoque, painel e alertas somam em BIGINT, com o estoque mínimo também no máximo."""
    produto, total = dois_lotes_cheios, 2 * MAX_INTEGER
    resposta = client.patch(f"/products/{produto.id}", headers=auth(token_admin), json={"estoque_minimo": MAX_INTEGER})
    assert resposta.status_code == 200

    estoque = client.get(f"/products/{produto.id}/stock", headers=auth(token_admin)).json()
    assert (estoque["saldo_fisico"], estoque["saldo_disponivel"]) == (total, total)

    [item] = client.get("/stock", headers=auth(token_admin)).json()["itens"]
    assert (item["saldo_fisico"], item["saldo_disponivel"], item["situacao"]) == (total, total, "ok")
    for situacao in ("baixo", "sem_estoque"):
        assert client.get("/stock", params={"situacao": situacao}, headers=auth(token_admin)).json()["total"] == 0

    painel = client.get("/dashboard", headers=auth(token_admin)).json()
    assert (painel["produtos_estoque_baixo"], painel["produtos_sem_estoque"], painel["lotes_a_vencer"]) == (0, 0, 1)
    assert [m["quantidade"] for m in painel["ultimas_movimentacoes"]] == [MAX_INTEGER, MAX_INTEGER]

    assert client.post("/alerts/generate", headers=auth(token_admin)).status_code == 200
    alertas = client.get("/alerts", headers=auth(token_admin)).json()["itens"]
    assert [a["tipo"] for a in alertas] == ["vencimento_proximo"]


def test_ct102_saida_e_ajuste_com_o_saldo_do_produto_acima_do_integer(client, db, token_admin, dois_lotes_cheios):
    produto = dois_lotes_cheios
    # A maior saída que a API aceita sai inteira do lote que vence antes (RN-10)
    resposta = saida(client, token_admin, produto.codigo_barras, MAX_INTEGER)
    assert resposta.status_code == 201
    assert resposta.json()["saldo_total"] == MAX_INTEGER
    assert [lote["quantidade_lote"] for lote in resposta.json()["lotes"]] == [0]
    # Acima do máximo, o schema recusa
    antes = retrato(db)
    assert saida(client, token_admin, produto.codigo_barras, MAX_INTEGER + 1).status_code == 422
    assert retrato(db) == antes

    # Volta ao dobro e ajusta um lote com o outro cheio
    assert entrada(client, token_admin, produto.codigo_barras, MAX_INTEGER, em_dias(10)).status_code == 201
    lote_id = client.get(f"/products/{produto.id}/stock", headers=auth(token_admin)).json()["lotes"][0]["id"]
    resposta = ajuste(client, token_admin, lote_id, MAX_INTEGER - 1)
    assert resposta.status_code == 201
    assert resposta.json()["saldo_total"] == 2 * MAX_INTEGER - 1

    # Saída que atravessa os dois lotes com o saldo do produto acima do INTEGER
    resposta = saida(client, token_admin, produto.codigo_barras, MAX_INTEGER)
    assert resposta.status_code == 201
    assert [lote["quantidade"] for lote in resposta.json()["lotes"]] == [MAX_INTEGER - 1, 1]
    historico = client.get(f"/products/{produto.id}/movements", headers=auth(token_admin))
    assert historico.status_code == 200
    # 3 entradas, 1 saída de um lote, 1 ajuste e 1 saída de dois lotes
    assert historico.json()["total"] == 7


def test_ct102_saldo_vencido_acima_do_integer(client, db, token_admin, dois_lotes_cheios):
    """RN-36: os dois lotes vencidos somam no saldo físico e ficam fora do disponível."""
    for lote in db.scalars(select(Batch)):
        lote.validade -= timedelta(days=100)
    db.commit()
    estoque = client.get(f"/products/{dois_lotes_cheios.id}/stock", headers=auth(token_admin)).json()
    assert (estoque["saldo_fisico"], estoque["saldo_disponivel"]) == (2 * MAX_INTEGER, 0)
    assert saida(client, token_admin, dois_lotes_cheios.codigo_barras, MAX_INTEGER).status_code == 409
    assert client.get("/dashboard", headers=auth(token_admin)).json()["lotes_vencidos"] == 2


def test_ct102_soma_dos_lotes_e_bigint_no_banco(db):
    """O porquê de a soma não estourar: SUM de INTEGER é BIGINT, inclusive com o CASE do saldo disponível."""
    tipos = db.execute(
        select(
            func.pg_typeof(condicoes.saldo_fisico()).label("fisico"),
            func.pg_typeof(condicoes.saldo_disponivel(service.hoje())).label("disponivel"),
        ).select_from(Batch)
    ).one()
    assert tuple(tipos) == ("bigint", "bigint")


@pytest.mark.parametrize(
    "validade",
    ["0000-01-01", "0001-01-01", "10000-01-01", "2099-02-30", "9" * 5000, 10**30, -(10**30), 0, 1.5, True, [], {}],
    ids=["ano-0", "ano-1", "ano-10000", "30-de-fevereiro", "5000-digitos", "1e30", "menos-1e30", "zero", "fracao", "true", "lista", "objeto"],
)
def test_ct102_validades_absurdas_nunca_dao_500(client, db, token_admin, refrigerante, validade):
    antes = retrato(db)
    assert entrada(client, token_admin, refrigerante.codigo_barras, 1, validade).status_code == 422
    assert retrato(db) == antes


NUMEROS_ABSURDOS = {"1e400": "1e400", "menos-1e400": "-1e400", "nan": "NaN", "infinito": "Infinity", "5000-digitos": "9" * 5000}


@pytest.mark.parametrize("numero", NUMEROS_ABSURDOS.values(), ids=NUMEROS_ABSURDOS.keys())
@pytest.mark.parametrize(
    ("caminho", "corpo"),
    [
        ("/products", '{"nome": "X", "codigo_barras": "1", "estoque_minimo": %s}'),
        (
            "/products",
            '{"nome": "X", "codigo_barras": "1", "estoque_minimo": 1, "controla_validade": true,'
            ' "dias_alerta_validade": %s}',
        ),
        ("/stock/entries", '{"codigo_barras": "7891000000002", "quantidade": %s}'),
        ("/stock/exits", '{"codigo_barras": "7891000000002", "quantidade": %s}'),
        ("/stock/adjustments", '{"lote_id": 1, "saldo_contado": %s, "motivo": "contagem"}'),
        ("/stock/adjustments", '{"lote_id": %s, "saldo_contado": 1, "motivo": "contagem"}'),
        ("/products", '{"nome": "X", "codigo_barras": "1", "estoque_minimo": 1, "fornecedor_id": %s}'),
        ("/stock/entries", '{"codigo_barras": "7891000000002", "quantidade": 1, "validade": %s}'),
    ],
    ids=["estoque-minimo", "dias", "entrada", "saida", "ajuste", "lote", "fornecedor", "validade"],
)
def test_ct102_numeros_absurdos_no_json_nunca_dao_500(client, db, token_admin, detergente, caminho, corpo, numero):
    antes = retrato(db)
    resposta = client.post(
        caminho, headers=auth(token_admin) | {"Content-Type": "application/json"}, content=corpo % numero
    )
    assert resposta.status_code in (400, 422)
    assert retrato(db) == antes
