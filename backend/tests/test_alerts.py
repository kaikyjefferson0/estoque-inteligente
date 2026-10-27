from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.core import clock
from app.models.alert import Alert
from app.models.batch import Batch
from app.models.stock_movement import StockMovement
from app.services import alerts as alertas_service
from app.services import stock as stock_service


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


def ajuste(client, token, lote_id, saldo_contado, motivo="contagem") -> dict:
    resposta = client.post(
        "/stock/adjustments",
        headers=auth(token),
        json={"lote_id": lote_id, "saldo_contado": saldo_contado, "motivo": motivo},
    )
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def alertas(client, token, **filtros) -> list[dict]:
    resposta = client.get("/alerts", headers=auth(token), params=filtros)
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def gerar(client, token) -> dict:
    resposta = client.post("/alerts/generate", headers=auth(token))
    assert resposta.status_code == 200, resposta.text
    return resposta.json()


def condicoes(lista: list[dict]) -> set[tuple[str, int | None]]:
    return {(alerta["tipo"], alerta["lote_id"]) for alerta in lista}


# --- Casos de teste do docs\casos-de-teste.md ---


def test_ct16_saldo_igual_ou_abaixo_do_minimo_cria_alerta_de_estoque_baixo(client, token_admin, detergente):
    """CT-16 / RN-13: mínimo 5; com 10 não há alerta, com 5 (igual ao mínimo) há."""
    entrada(client, token_admin, detergente.codigo_barras, 10)
    assert alertas(client, token_admin) == []

    saida(client, token_admin, detergente.codigo_barras, 5)
    lista = alertas(client, token_admin)
    assert len(lista) == 1
    alerta = lista[0]
    assert alerta["tipo"] == "estoque_baixo"
    assert alerta["produto_id"] == detergente.id
    assert alerta["produto_nome"] == "Detergente"
    assert alerta["lote_id"] is None
    assert alerta["validade"] is None
    assert alerta["resolvido_em"] is None


def test_ct17_lote_dentro_dos_dias_de_antecedencia_cria_alerta_de_vencimento_proximo(client, token_admin, refrigerante):
    """CT-17 / RN-14: alerta de 30 dias; o lote de 10 dias alerta, o de 60 não."""
    proximo = entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(10))
    entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(60))

    lista = alertas(client, token_admin)
    assert condicoes(lista) == {("vencimento_proximo", proximo["lote_id"])}
    assert lista[0]["validade"] == em_dias(10)
    assert lista[0]["produto_nome"] == "Refrigerante 2L"


def test_ct18_lote_com_validade_passada_cria_alerta_de_vencido(client, token_admin, refrigerante, monkeypatch):
    """CT-18 / RN-15: o lote vence sem movimentação; a geração completa cria o alerta."""
    lote = entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(5))
    entrada(client, token_admin, refrigerante.codigo_barras, 50, em_dias(120))

    avancar_dias(monkeypatch, 6)
    gerar(client, token_admin)

    assert ("vencido", lote["lote_id"]) in condicoes(alertas(client, token_admin, tipo="vencido"))


def test_ct19_gerar_alertas_duas_vezes_nao_repete(client, db, token_admin, refrigerante, detergente):
    """CT-19 / RN-16: a segunda geração não cria nem resolve nada."""
    entrada(client, token_admin, refrigerante.codigo_barras, 5, em_dias(10))
    entrada(client, token_admin, detergente.codigo_barras, 2)

    gerar(client, token_admin)
    antes = db.query(Alert).count()
    assert gerar(client, token_admin) == {"criados": 0, "resolvidos": 0}
    assert db.query(Alert).count() == antes

    lista = alertas(client, token_admin)
    unicos = {(a["tipo"], a["produto_id"], a["lote_id"]) for a in lista}
    assert len(lista) == len(unicos) == 3  # estoque baixo x2 + vencimento próximo


def test_ct42_estoque_reposto_acima_do_minimo_resolve_alerta(client, token_admin, detergente):
    """CT-42 / RN-39: o alerta fica resolvido, com data, e não é apagado."""
    entrada(client, token_admin, detergente.codigo_barras, 3)
    assert condicoes(alertas(client, token_admin)) == {("estoque_baixo", None)}

    entrada(client, token_admin, detergente.codigo_barras, 10)
    assert alertas(client, token_admin) == []

    historico = alertas(client, token_admin, incluir_resolvidos=True)
    assert len(historico) == 1
    assert historico[0]["tipo"] == "estoque_baixo"
    assert historico[0]["resolvido_em"] is not None


def test_ct43_lote_vencido_baixado_por_ajuste_resolve_alerta(client, token_admin, refrigerante, monkeypatch):
    """CT-43 / RN-38, RN-39: ajuste para 0 com motivo "vencido" resolve o alerta de vencido."""
    lote = entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(5))
    entrada(client, token_admin, refrigerante.codigo_barras, 50, em_dias(120))
    avancar_dias(monkeypatch, 6)
    gerar(client, token_admin)
    assert condicoes(alertas(client, token_admin)) == {("vencido", lote["lote_id"])}

    ajuste(client, token_admin, lote["lote_id"], 0, motivo="vencido")

    assert alertas(client, token_admin) == []
    resolvido = alertas(client, token_admin, incluir_resolvidos=True, tipo="vencido")
    assert len(resolvido) == 1
    assert resolvido[0]["resolvido_em"] is not None


def test_ct44_lote_passa_de_proximo_do_vencimento_para_vencido(client, token_admin, refrigerante, monkeypatch):
    """CT-44 / RN-42: o vencimento próximo é resolvido e nasce o de vencido."""
    lote = entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(3))
    entrada(client, token_admin, refrigerante.codigo_barras, 50, em_dias(120))
    assert condicoes(alertas(client, token_admin)) == {("vencimento_proximo", lote["lote_id"])}

    avancar_dias(monkeypatch, 4)
    assert gerar(client, token_admin) == {"criados": 1, "resolvidos": 1}

    assert condicoes(alertas(client, token_admin)) == {("vencido", lote["lote_id"])}
    resolvidos = [a for a in alertas(client, token_admin, incluir_resolvidos=True, tipo="vencimento_proximo") if a["resolvido_em"]]
    assert condicoes(resolvidos) == {("vencimento_proximo", lote["lote_id"])}


def test_ct45_condicao_que_volta_depois_de_resolvida_cria_alerta_novo(client, token_admin, detergente):
    """CT-45 / RN-39: o resolvido continua resolvido e nasce outro alerta ativo."""
    entrada(client, token_admin, detergente.codigo_barras, 3)
    primeiro = alertas(client, token_admin)[0]
    entrada(client, token_admin, detergente.codigo_barras, 10)
    saida(client, token_admin, detergente.codigo_barras, 10)

    ativos = alertas(client, token_admin)
    assert len(ativos) == 1
    assert ativos[0]["tipo"] == "estoque_baixo"
    assert ativos[0]["id"] != primeiro["id"]

    todos = alertas(client, token_admin, incluir_resolvidos=True)
    assert len(todos) == 2
    antigo = next(a for a in todos if a["id"] == primeiro["id"])
    assert antigo["resolvido_em"] is not None


def test_ct46_lote_zerado_nao_gera_alerta_de_validade(client, token_admin, refrigerante, monkeypatch):
    """CT-46 / RN-42 e RN-37: o lote zerado continua existindo, mas não alerta."""
    lote = entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(10))
    entrada(client, token_admin, refrigerante.codigo_barras, 50, em_dias(120))
    assert condicoes(alertas(client, token_admin)) == {("vencimento_proximo", lote["lote_id"])}

    saida(client, token_admin, refrigerante.codigo_barras, 20)  # FEFO zera o lote de 10 dias
    assert alertas(client, token_admin) == []

    avancar_dias(monkeypatch, 11)  # o lote zerado vence
    gerar(client, token_admin)
    assert alertas(client, token_admin) == []


def test_ct47_lote_vencido_nao_conta_para_o_estoque_baixo(client, token_admin, refrigerante, monkeypatch):
    """CT-47 / RN-41: 8 (vencido) + 5 = 13 físico, mas só 5 disponível <= mínimo 10."""
    vencido = entrada(client, token_admin, refrigerante.codigo_barras, 8, em_dias(5))
    entrada(client, token_admin, refrigerante.codigo_barras, 5, em_dias(120))
    assert ("estoque_baixo", None) not in condicoes(alertas(client, token_admin))

    avancar_dias(monkeypatch, 6)
    gerar(client, token_admin)

    assert condicoes(alertas(client, token_admin)) == {("estoque_baixo", None), ("vencido", vencido["lote_id"])}


# --- Permissões e gatilhos ---


def test_operador_ve_e_gera_alertas(client, token_admin, token_operador, detergente):
    """RN-43."""
    entrada(client, token_admin, detergente.codigo_barras, 2)
    assert condicoes(alertas(client, token_operador)) == {("estoque_baixo", None)}
    assert gerar(client, token_operador) == {"criados": 0, "resolvidos": 0}


def test_rotas_de_alertas_sem_token_devolvem_401(client):
    """RN-18."""
    assert client.get("/alerts").status_code == 401
    assert client.post("/alerts/generate").status_code == 401


def test_entrada_dispara_a_geracao_do_produto(client, token_admin, detergente):
    """RN-40: sem chamar /alerts/generate."""
    entrada(client, token_admin, detergente.codigo_barras, 2)
    assert condicoes(alertas(client, token_admin)) == {("estoque_baixo", None)}


def test_saida_dispara_a_geracao_do_produto(client, token_admin, detergente):
    """RN-40."""
    entrada(client, token_admin, detergente.codigo_barras, 10)
    assert alertas(client, token_admin) == []
    saida(client, token_admin, detergente.codigo_barras, 6)
    assert condicoes(alertas(client, token_admin)) == {("estoque_baixo", None)}


def test_ajuste_dispara_a_geracao_do_produto(client, token_admin, detergente):
    """RN-40: o ajuste cria e também resolve."""
    lote = entrada(client, token_admin, detergente.codigo_barras, 10)
    ajuste(client, token_admin, lote["lote_id"], 1)
    assert condicoes(alertas(client, token_admin)) == {("estoque_baixo", None)}
    ajuste(client, token_admin, lote["lote_id"], 20)
    assert alertas(client, token_admin) == []


def test_geracao_do_produto_roda_na_mesma_transacao_da_movimentacao(db, admin, detergente, monkeypatch):
    """RN-40: se a geração falha, a entrada também é desfeita."""

    def falhar(*_args, **_kwargs):
        raise RuntimeError("falha na geração")

    monkeypatch.setattr(stock_service.alertas, "gerar_alertas_produto", falhar)
    with pytest.raises(RuntimeError):
        stock_service.registrar_entrada(db, admin, detergente.codigo_barras, 10)
    assert db.query(Batch).count() == 0
    assert db.query(StockMovement).count() == 0


def test_fuso_de_brasilia_decide_o_vencimento(client, token_admin, refrigerante, monkeypatch):
    """O lote de 26/10 vence às 00:00 de 27/10 em Brasília (03:00 UTC), não à meia-noite UTC."""
    monkeypatch.setattr(clock, "_agora_utc", lambda: datetime(2026, 10, 27, 2, 59, tzinfo=timezone.utc))
    lote = entrada(client, token_admin, refrigerante.codigo_barras, 50, "2026-10-26")
    # Em Brasília ainda é dia 26: vence hoje, então é vencimento próximo (RN-36)
    assert condicoes(alertas(client, token_admin)) == {("vencimento_proximo", lote["lote_id"])}

    monkeypatch.setattr(clock, "_agora_utc", lambda: datetime(2026, 10, 27, 3, 0, tzinfo=timezone.utc))
    assert gerar(client, token_admin) == {"criados": 2, "resolvidos": 1}
    # Vencido; e o saldo disponível cai para 0 (RN-41), então também estoque baixo
    assert condicoes(alertas(client, token_admin)) == {("vencido", lote["lote_id"]), ("estoque_baixo", None)}


def test_limite_dos_dias_de_antecedencia(client, token_admin, refrigerante):
    """RN-14: vence em exatamente 30 dias alerta; em 31 não."""
    no_limite = entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(30))
    entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(31))
    assert condicoes(alertas(client, token_admin)) == {("vencimento_proximo", no_limite["lote_id"])}


def test_filtros_por_tipo_e_produto(client, token_admin, refrigerante, detergente):
    entrada(client, token_admin, refrigerante.codigo_barras, 5, em_dias(10))
    entrada(client, token_admin, detergente.codigo_barras, 2)

    assert {a["produto_id"] for a in alertas(client, token_admin, produto_id=detergente.id)} == {detergente.id}
    vencendo = alertas(client, token_admin, tipo="vencimento_proximo")
    assert [a["produto_id"] for a in vencendo] == [refrigerante.id]
    assert len(alertas(client, token_admin, tipo="estoque_baixo")) == 2
    assert client.get("/alerts", headers=auth(token_admin), params={"tipo": "outro"}).status_code == 422


def test_banco_recusa_dois_alertas_ativos_iguais_mas_aceita_depois_de_resolvido(db, detergente):
    """RN-16 e RN-39 no banco: índice único parcial com NULLS NOT DISTINCT."""
    # O cadastro já criou o estoque_baixo ativo do detergente (saldo 0 <= mínimo 5)
    assert db.query(Alert).filter_by(tipo="estoque_baixo", resolvido_em=None).count() == 1
    with pytest.raises(IntegrityError), db.begin_nested():
        db.add(Alert(tipo="estoque_baixo", produto_id=detergente.id))
        db.flush()

    db.query(Alert).update({"resolvido_em": datetime.now(timezone.utc)})
    db.add(Alert(tipo="estoque_baixo", produto_id=detergente.id))
    db.flush()
    assert db.query(Alert).count() == 2


def test_banco_recusa_alerta_de_validade_sem_lote(db, refrigerante):
    with pytest.raises(IntegrityError), db.begin_nested():
        db.add(Alert(tipo="vencido", produto_id=refrigerante.id))
        db.flush()


def test_cadastro_de_produto_gera_os_alertas_do_produto(db, refrigerante):
    """RN-40: produto recém-cadastrado (saldo 0 <= mínimo 10) já nasce com estoque baixo."""
    assert db.query(Alert).one().tipo == "estoque_baixo"
    assert alertas_service.gerar_alertas(db).criados == 0


def test_edicao_do_produto_gera_os_alertas_do_produto(client, token_admin, refrigerante):
    """RN-40: mudar o mínimo ou os dias de alerta recalcula os alertas do produto."""
    lote = entrada(client, token_admin, refrigerante.codigo_barras, 20, em_dias(40))
    assert alertas(client, token_admin) == []

    resposta = client.patch(
        f"/products/{refrigerante.id}",
        headers=auth(token_admin),
        json={"estoque_minimo": 20, "dias_alerta_validade": 45},
    )
    assert resposta.status_code == 200, resposta.text
    assert condicoes(alertas(client, token_admin)) == {
        ("estoque_baixo", None),
        ("vencimento_proximo", lote["lote_id"]),
    }


def _erro_transitorio() -> DBAPIError:
    class Orig(Exception):
        sqlstate = "40P01"  # deadlock_detected

    return DBAPIError("SELECT 1", {}, Orig())


def test_geracao_completa_tenta_de_novo_em_deadlock(db, refrigerante, detergente, monkeypatch):
    """Revisão da Fase 9: um deadlock num produto não interrompe os demais."""
    original = alertas_service.gerar_alertas_produto
    falhas = {"restantes": 2}

    def instavel(sessao, produto_id):
        if produto_id == refrigerante.id and falhas["restantes"]:
            falhas["restantes"] -= 1
            raise _erro_transitorio()
        return original(sessao, produto_id)

    monkeypatch.setattr(alertas_service, "gerar_alertas_produto", instavel)
    assert alertas_service.gerar_alertas(db) == alertas_service.ResultadoGeracao(criados=0, resolvidos=0)
    assert falhas["restantes"] == 0


def test_geracao_completa_desiste_depois_de_tres_tentativas(db, refrigerante, monkeypatch):
    def sempre_falha(*_args):
        raise _erro_transitorio()

    monkeypatch.setattr(alertas_service, "gerar_alertas_produto", sempre_falha)
    with pytest.raises(DBAPIError):
        alertas_service.gerar_alertas(db)
