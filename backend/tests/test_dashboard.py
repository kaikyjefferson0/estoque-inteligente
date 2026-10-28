from datetime import datetime, timedelta, timezone

from app.core import clock
from app.models.batch import Batch
from app.services.products import criar_produto


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def em_dias(dias: int) -> str:
    return (clock.hoje() + timedelta(days=dias)).isoformat()


def avancar_dias(monkeypatch, dias: int) -> None:
    """Simula a passagem do tempo: o "hoje" passa a ser daqui a `dias` dias."""
    futuro = datetime.now(timezone.utc) + timedelta(days=dias)
    monkeypatch.setattr(clock, "_agora_utc", lambda: futuro)


def entrada(client, token, codigo_barras, quantidade, validade=None) -> dict:
    dados = {"codigo_barras": codigo_barras, "quantidade": quantidade}
    if validade is not None:
        dados["validade"] = validade
    resposta = client.post("/stock/entries", headers=auth(token), json=dados)
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def saida(client, token, codigo_barras, quantidade) -> dict:
    resposta = client.post(
        "/stock/exits", headers=auth(token), json={"codigo_barras": codigo_barras, "quantidade": quantidade}
    )
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def ajuste(client, token, lote_id, saldo_contado, motivo="Contagem do inventário") -> dict:
    resposta = client.post(
        "/stock/adjustments",
        headers=auth(token),
        json={"lote_id": lote_id, "saldo_contado": saldo_contado, "motivo": motivo},
    )
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def lote_direto(db, produto, quantidade, validade=None) -> Batch:
    """Cria o lote direto no banco; a entrada recusaria validade vencida (RN-31)."""
    lote = Batch(produto_id=produto.id, validade=validade, quantidade=quantidade)
    db.add(lote)
    db.commit()
    return lote


def estoque(client, token, **filtros) -> list[dict]:
    resposta = client.get("/stock", headers=auth(token), params=filtros)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()["itens"]


def saldo_produto(client, token, produto_id) -> dict:
    resposta = client.get(f"/products/{produto_id}/stock", headers=auth(token))
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def dashboard(client, token) -> dict:
    resposta = client.get("/dashboard", headers=auth(token))
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


# --- Casos de teste do docs\casos-de-teste.md ---


def test_ct20_dashboard_bate_com_a_lista_de_estoque(client, db, token_admin, refrigerante, detergente, monkeypatch):
    """CT-20 / RN-17 e RN-44: depois de entradas, saídas e um ajuste, cada número do
    dashboard é igual ao calculado a partir do GET /stock (e dos lotes e alertas)."""
    arroz = criar_produto(db, nome="Arroz 5kg", codigo_barras="7891000000003", estoque_minimo=2)

    # Refrigerante (mínimo 10, alerta 30 dias): três lotes, saída de 3 do que vence antes (FEFO)
    lote_curto = entrada(client, token_admin, refrigerante.codigo_barras, 5, em_dias(1))["lote_id"]
    lote_medio = entrada(client, token_admin, refrigerante.codigo_barras, 8, em_dias(10))["lote_id"]
    entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(90))
    saida(client, token_admin, refrigerante.codigo_barras, 3)
    # Detergente (mínimo 5): entra e sai tudo, fica sem estoque
    entrada(client, token_admin, detergente.codigo_barras, 10)
    saida(client, token_admin, detergente.codigo_barras, 10)
    # Arroz (mínimo 2): ajuste para 1, fica baixo
    lote_arroz = entrada(client, token_admin, arroz.codigo_barras, 6)["lote_id"]
    ajuste(client, token_admin, lote_arroz, 1)

    # Cinco dias depois: o lote curto (2 unidades) venceu, o médio vence em 5 dias, o longo em 85
    avancar_dias(monkeypatch, 5)

    # Antes da geração: os números calculados dos lotes já mudaram, mas os alertas ativos
    # ainda são os da última movimentação (exceção da RN-44): falta o "vencido" do lote curto
    antes = dashboard(client, token_admin)
    assert (antes["lotes_vencidos"], antes["lotes_a_vencer"], antes["alertas_ativos"]) == (1, 1, 4)
    alertas_antes = client.get("/alerts", headers=auth(token_admin)).json()["itens"]
    assert ("vencido", lote_curto) not in {(a["tipo"], a["lote_id"]) for a in alertas_antes}

    # RN-40: a geração completa (Cron diário) põe os alertas em dia
    assert client.post("/alerts/generate", headers=auth(token_admin)).status_code == 200

    painel = dashboard(client, token_admin)
    lista = estoque(client, token_admin)
    # Os números calculados dos lotes não dependem da geração
    sem_alertas = lambda numeros: {chave: valor for chave, valor in numeros.items() if chave != "alertas_ativos"}  # noqa: E731
    assert sem_alertas(painel) == sem_alertas(antes)

    # Produtos: comparados com a lista de estoque e com os filtros da própria API
    assert painel["total_produtos"] == len(lista) == 3
    baixos = estoque(client, token_admin, situacao="baixo")
    assert baixos == [item for item in lista if item["saldo_disponivel"] <= item["estoque_minimo"]]
    assert painel["produtos_estoque_baixo"] == len(baixos) == 2
    assert {item["situacao"] for item in baixos} == {"baixo", "sem_estoque"}
    sem_estoque = estoque(client, token_admin, situacao="sem_estoque")
    assert painel["produtos_sem_estoque"] == len(sem_estoque) == 1
    assert sem_estoque[0]["produto_id"] == detergente.id
    ok = estoque(client, token_admin, situacao="ok")
    assert painel["total_produtos"] - painel["produtos_estoque_baixo"] == len(ok) == 1

    # Lotes: comparados com os lotes e as validades de cada produto da lista
    hoje = clock.hoje()
    a_vencer, vencidos = set(), set()
    for item in lista:
        for lote in saldo_produto(client, token_admin, item["produto_id"])["lotes"]:
            if lote["validade"] is None:
                continue
            validade = datetime.fromisoformat(lote["validade"]).date()
            if validade < hoje:
                vencidos.add(lote["id"])
            elif validade <= hoje + timedelta(days=refrigerante.dias_alerta_validade):
                a_vencer.add(lote["id"])
    assert vencidos == {lote_curto}
    assert a_vencer == {lote_medio}
    assert painel["lotes_vencidos"] == len(vencidos)
    assert painel["lotes_a_vencer"] == len(a_vencer)

    # Alertas: os mesmos que o GET /alerts mostra, e nas mesmas condições (RN-44)
    alertas = client.get("/alerts", headers=auth(token_admin)).json()["itens"]
    assert painel["alertas_ativos"] == len(alertas) == 4
    assert {(a["tipo"], a["lote_id"]) for a in alertas if a["tipo"] != "estoque_baixo"} == {
        ("vencido", lote_curto),
        ("vencimento_proximo", lote_medio),
    }
    assert {a["produto_id"] for a in alertas if a["tipo"] == "estoque_baixo"} == {item["produto_id"] for item in baixos}

    # Saldo do refrigerante: 33 - 3 = 30 físico; sem os 2 vencidos, 28 disponíveis
    refri = next(item for item in lista if item["produto_id"] == refrigerante.id)
    assert (refri["saldo_fisico"], refri["saldo_disponivel"], refri["situacao"]) == (30, 28, "ok")

    # Últimas 5 movimentações, da mais recente para a mais antiga
    ultimas = painel["ultimas_movimentacoes"]
    assert [(m["tipo"], m["produto_id"]) for m in ultimas] == [
        ("ajuste", arroz.id),
        ("entrada", arroz.id),
        ("saida", detergente.id),
        ("entrada", detergente.id),
        ("saida", refrigerante.id),
    ]
    assert ultimas[0]["quantidade"] == -5
    assert ultimas[0]["produto_nome"] == "Arroz 5kg"
    assert ultimas[0]["usuario_nome"] == "Admin"


def test_ct48_lista_de_estoque_mostra_saldos_minimo_e_situacao(client, token_admin, refrigerante, detergente):
    """CT-48: todos os produtos, com e sem lotes, com saldo físico, disponível, mínimo e situação."""
    entrada(client, token_admin, refrigerante.codigo_barras, 15, em_dias(60))
    entrada(client, token_admin, detergente.codigo_barras, 3)

    assert estoque(client, token_admin) == [
        {
            "produto_id": detergente.id,
            "nome": "Detergente",
            "codigo_barras": "7891000000002",
            "saldo_fisico": 3,
            "saldo_disponivel": 3,
            "estoque_minimo": 5,
            "situacao": "baixo",
        },
        {
            "produto_id": refrigerante.id,
            "nome": "Refrigerante 2L",
            "codigo_barras": "7891000000001",
            "saldo_fisico": 15,
            "saldo_disponivel": 15,
            "estoque_minimo": 10,
            "situacao": "ok",
        },
    ]
    # Filtro pela situação exata
    assert [item["produto_id"] for item in estoque(client, token_admin, situacao="ok")] == [refrigerante.id]
    assert [item["produto_id"] for item in estoque(client, token_admin, situacao="baixo")] == [detergente.id]
    assert estoque(client, token_admin, situacao="sem_estoque") == []
    # CT-50: o filtro "baixo" também traz quem está sem estoque
    saida(client, token_admin, detergente.codigo_barras, 3)
    assert [item["situacao"] for item in estoque(client, token_admin, situacao="baixo")] == ["sem_estoque"]


def test_ct49_lote_vencido_conta_no_fisico_e_nos_vencidos_e_nao_no_disponivel(client, db, token_admin, refrigerante):
    """CT-49 / RN-36: 5 vencidas + 12 válidas = 17 físicas, 12 disponíveis, 1 lote vencido."""
    lote_direto(db, refrigerante, 5, clock.hoje() - timedelta(days=1))
    lote_direto(db, refrigerante, 12, clock.hoje() + timedelta(days=60))

    produto = saldo_produto(client, token_admin, refrigerante.id)
    assert (produto["saldo_fisico"], produto["saldo_disponivel"]) == (17, 12)

    (item,) = estoque(client, token_admin)
    assert (item["saldo_fisico"], item["saldo_disponivel"], item["situacao"]) == (17, 12, "ok")

    painel = dashboard(client, token_admin)
    assert (painel["lotes_vencidos"], painel["lotes_a_vencer"], painel["produtos_estoque_baixo"]) == (1, 0, 0)


def test_ct50_saldo_disponivel_zero_conta_em_sem_estoque_e_em_estoque_baixo(client, db, token_admin, refrigerante, detergente):
    """CT-50: detergente zerado por saída e refrigerante só com lote vencido têm disponível zero."""
    entrada(client, token_admin, detergente.codigo_barras, 5)
    saida(client, token_admin, detergente.codigo_barras, 5)
    lote_direto(db, refrigerante, 7, clock.hoje() - timedelta(days=3))

    painel = dashboard(client, token_admin)
    assert (painel["produtos_sem_estoque"], painel["produtos_estoque_baixo"]) == (2, 2)

    lista = estoque(client, token_admin, situacao="sem_estoque")
    assert {item["produto_id"] for item in lista} == {detergente.id, refrigerante.id}
    refri = next(item for item in lista if item["produto_id"] == refrigerante.id)
    assert (refri["saldo_fisico"], refri["saldo_disponivel"]) == (7, 0)


def test_ct51_dashboard_sem_produtos_mostra_tudo_zerado(client, token_admin):
    """CT-51: sem nenhum produto, todos os números zerados e nenhuma movimentação."""
    assert dashboard(client, token_admin) == {
        "total_produtos": 0,
        "produtos_estoque_baixo": 0,
        "produtos_sem_estoque": 0,
        "lotes_a_vencer": 0,
        "lotes_vencidos": 0,
        "alertas_ativos": 0,
        "ultimas_movimentacoes": [],
    }
    assert estoque(client, token_admin) == []


# --- Permissões e validações ---


def test_operador_ve_o_dashboard_e_a_lista_de_estoque(client, token_operador, detergente):
    """RN-46."""
    assert dashboard(client, token_operador)["total_produtos"] == 1
    assert len(estoque(client, token_operador)) == 1


def test_dashboard_e_lista_de_estoque_sem_token_devolvem_401(client, detergente):
    """RN-18."""
    assert client.get("/dashboard").status_code == 401
    assert client.get("/stock").status_code == 401


def test_filtro_de_situacao_invalido_devolve_422(client, token_admin):
    assert client.get("/stock", headers=auth(token_admin), params={"situacao": "vencido"}).status_code == 422


def test_dashboard_mostra_so_as_5_ultimas_movimentacoes(client, token_admin, detergente):
    for _ in range(7):
        entrada(client, token_admin, detergente.codigo_barras, 1)
    ultimas = dashboard(client, token_admin)["ultimas_movimentacoes"]
    assert len(ultimas) == 5
    assert [m["id"] for m in ultimas] == sorted((m["id"] for m in ultimas), reverse=True)
