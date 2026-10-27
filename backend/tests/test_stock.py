from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.core import clock
from app.main import app

from app.models.batch import Batch
from app.models.stock_movement import StockMovement
from app.services import stock as service


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def em_dias(dias: int) -> str:
    return (service.hoje() + timedelta(days=dias)).isoformat()


def entrada(client, token, codigo_barras, quantidade, validade=None):
    dados = {"codigo_barras": codigo_barras, "quantidade": quantidade}
    if validade is not None:
        dados["validade"] = validade
    return client.post("/stock/entries", headers=auth(token), json=dados)


def saldo(client, token, produto_id) -> dict:
    resposta = client.get(f"/products/{produto_id}/stock", headers=auth(token))
    assert resposta.status_code == 200
    return resposta.json()


# --- Casos de teste do docs\casos-de-teste.md ---


def test_ct07_entrada_pelo_codigo_aumenta_saldo_e_aparece_no_historico(client, token_admin, admin, refrigerante):
    """CT-07 / RN-07, RN-08: saldo +10 e entrada no histórico."""
    assert saldo(client, token_admin, refrigerante.id)["saldo_fisico"] == 0

    resposta = entrada(client, token_admin, refrigerante.codigo_barras, 10, em_dias(60))
    assert resposta.status_code == 201
    assert resposta.json()["saldo_total"] == 10

    assert saldo(client, token_admin, refrigerante.id)["saldo_fisico"] == 10
    historico = client.get(f"/products/{refrigerante.id}/movements", headers=auth(token_admin)).json()
    assert len(historico) == 1
    assert historico[0]["tipo"] == "entrada"
    assert historico[0]["quantidade"] == 10
    assert historico[0]["validade"] == em_dias(60)
    assert historico[0]["usuario_id"] == admin.id
    assert historico[0]["usuario_nome"] == "Admin"


def test_ct08_entrada_com_quantidade_zero_ou_negativa(client, db, token_admin, detergente):
    """CT-08 / RN-07: recusa e não grava nada."""
    for quantidade in (0, -5):
        assert entrada(client, token_admin, detergente.codigo_barras, quantidade).status_code == 422
    assert db.query(StockMovement).count() == 0
    assert db.query(Batch).count() == 0


def test_ct08_service_tambem_recusa_quantidade_invalida(db, admin, detergente):
    with pytest.raises(service.QuantidadeInvalidaError):
        service.registrar_entrada(db, admin, detergente.codigo_barras, 0)


def test_ct09_produto_com_validade_sem_informar_a_data(client, db, token_admin, refrigerante):
    """CT-09 / RN-08: recusa e pede a data."""
    resposta = entrada(client, token_admin, refrigerante.codigo_barras, 10)
    assert resposta.status_code == 422
    assert "validade" in resposta.json()["detail"]
    assert db.query(Batch).count() == 0
    assert db.query(StockMovement).count() == 0


def test_ct27_mesma_validade_soma_no_mesmo_lote(client, db, token_admin, refrigerante):
    """CT-27 / RN-28."""
    primeira = entrada(client, token_admin, refrigerante.codigo_barras, 10, em_dias(60)).json()
    segunda = entrada(client, token_admin, refrigerante.codigo_barras, 5, em_dias(60)).json()

    assert segunda["lote_id"] == primeira["lote_id"]
    assert segunda["quantidade_lote"] == 15
    assert db.query(Batch).filter(Batch.produto_id == refrigerante.id).count() == 1


def test_ct28_produto_sem_validade_soma_no_lote_unico(client, db, token_admin, detergente):
    """CT-28 / RN-27."""
    primeira = entrada(client, token_admin, detergente.codigo_barras, 4).json()
    segunda = entrada(client, token_admin, detergente.codigo_barras, 6).json()

    assert segunda["lote_id"] == primeira["lote_id"]
    assert segunda["validade"] is None
    assert segunda["quantidade_lote"] == 10
    assert db.query(Batch).filter(Batch.produto_id == detergente.id).count() == 1


def test_ct29_entrada_com_validade_vencida(client, db, token_admin, refrigerante):
    """CT-29 / RN-31: validade anterior a hoje é recusada; vencer hoje ainda é aceito."""
    assert entrada(client, token_admin, refrigerante.codigo_barras, 10, em_dias(-1)).status_code == 422
    assert db.query(Batch).count() == 0

    assert entrada(client, token_admin, refrigerante.codigo_barras, 10, em_dias(0)).status_code == 201


def test_ct30_produto_sem_validade_informando_validade(client, db, token_admin, detergente):
    """CT-30 / RN-31."""
    assert entrada(client, token_admin, detergente.codigo_barras, 10, em_dias(60)).status_code == 422
    assert db.query(Batch).count() == 0


def test_ct31_mudar_controla_validade_de_produto_com_lotes(client, db, token_admin, refrigerante, detergente):
    """CT-31 / RN-30: 409 e o campo continua igual."""
    headers = auth(token_admin)
    assert entrada(client, token_admin, refrigerante.codigo_barras, 10, em_dias(60)).status_code == 201
    assert entrada(client, token_admin, detergente.codigo_barras, 10).status_code == 201

    # Só controla_validade: a RN-30 vem antes da RN-26, então é 409 e não 422 (dias de alerta)
    resposta = client.patch(f"/products/{refrigerante.id}", headers=headers, json={"controla_validade": False})
    assert resposta.status_code == 409
    assert "já tem lotes" in resposta.json()["detail"]

    resposta = client.patch(
        f"/products/{refrigerante.id}",
        headers=headers,
        json={"controla_validade": False, "dias_alerta_validade": None},
    )
    assert resposta.status_code == 409
    resposta = client.patch(
        f"/products/{detergente.id}",
        headers=headers,
        json={"controla_validade": True, "dias_alerta_validade": 30},
    )
    assert resposta.status_code == 409

    db.refresh(refrigerante)
    db.refresh(detergente)
    assert refrigerante.controla_validade is True
    assert detergente.controla_validade is False

    # Os outros campos continuam editáveis, inclusive mandando o mesmo valor de controla_validade
    resposta = client.patch(
        f"/products/{refrigerante.id}", headers=headers, json={"controla_validade": True, "nome": "Refri 2L"}
    )
    assert resposta.status_code == 200


# --- Testes extras ---


def test_operador_registra_entrada(client, operador, token_operador, detergente):
    """RN-32."""
    resposta = entrada(client, token_operador, detergente.codigo_barras, 3)
    assert resposta.status_code == 201
    assert resposta.json()["usuario_id"] == operador.id


def test_rotas_de_estoque_sem_token_devolvem_401(client, detergente):
    """RN-18."""
    resposta = client.post("/stock/entries", json={"codigo_barras": detergente.codigo_barras, "quantidade": 1})
    assert resposta.status_code == 401
    assert client.get(f"/products/{detergente.id}/stock").status_code == 401
    assert client.get(f"/products/{detergente.id}/movements").status_code == 401


def test_codigo_de_barras_inexistente_devolve_404(client, db, token_admin):
    assert entrada(client, token_admin, "0000000000000", 10).status_code == 404
    assert db.query(StockMovement).count() == 0


def test_produto_inexistente_no_saldo_e_no_historico_devolve_404(client, token_admin):
    assert client.get("/products/999999/stock", headers=auth(token_admin)).status_code == 404
    assert client.get("/products/999999/movements", headers=auth(token_admin)).status_code == 404


def test_entrada_cria_exatamente_uma_movimentacao(client, db, token_admin, admin, detergente):
    resposta = entrada(client, token_admin, detergente.codigo_barras, 7)
    movimentacoes = db.query(StockMovement).all()
    assert len(movimentacoes) == 1
    mov = movimentacoes[0]
    assert mov.id == resposta.json()["movimentacao_id"]
    assert (mov.tipo, mov.quantidade, mov.produto_id, mov.usuario_id) == ("entrada", 7, detergente.id, admin.id)


def test_saldo_fisico_e_soma_dos_lotes_em_ordem_fefo(client, token_admin, refrigerante):
    for quantidade, dias in ((5, 90), (8, 30), (2, 60)):
        entrada(client, token_admin, refrigerante.codigo_barras, quantidade, em_dias(dias))

    estoque = saldo(client, token_admin, refrigerante.id)
    assert estoque["saldo_fisico"] == sum(lote["quantidade"] for lote in estoque["lotes"]) == 15
    assert [lote["validade"] for lote in estoque["lotes"]] == [em_dias(30), em_dias(60), em_dias(90)]


def test_historico_do_mais_recente_para_o_mais_antigo(client, token_admin, detergente):
    ids = [entrada(client, token_admin, detergente.codigo_barras, q).json()["movimentacao_id"] for q in (1, 2, 3)]
    historico = client.get(f"/products/{detergente.id}/movements", headers=auth(token_admin)).json()
    assert [mov["id"] for mov in historico] == list(reversed(ids))
    assert [mov["quantidade"] for mov in historico] == [3, 2, 1]


def test_hoje_e_o_dia_em_brasilia_e_nao_em_utc(client, token_admin, refrigerante, monkeypatch):
    """RN-31: 27/10 01:00 UTC ainda é 26/10 22:00 em Brasília; validade 26/10 vence hoje e é aceita."""
    monkeypatch.setattr(clock, "_agora_utc", lambda: datetime(2026, 10, 27, 1, 0, tzinfo=timezone.utc))
    assert service.hoje() == date(2026, 10, 26)

    assert entrada(client, token_admin, refrigerante.codigo_barras, 10, "2026-10-26").status_code == 201
    assert entrada(client, token_admin, refrigerante.codigo_barras, 10, "2026-10-25").status_code == 422


def test_entrada_usa_controla_validade_atual_do_banco(client, db, token_admin, refrigerante):
    """O produto já está na sessão (fixture) com controla_validade=True; a entrada relê o valor do banco."""
    db.execute(
        text("UPDATE products SET controla_validade = false, dias_alerta_validade = NULL WHERE id = :id"),
        {"id": refrigerante.id},
    )
    resposta = entrada(client, token_admin, refrigerante.codigo_barras, 10)
    assert resposta.status_code == 201
    assert resposta.json()["validade"] is None


def test_banco_recusa_movimentacao_com_lote_de_outro_produto(db, admin, refrigerante, detergente):
    lote = Batch(produto_id=refrigerante.id, validade=date.today() + timedelta(days=60), quantidade=10)
    db.add(lote)
    db.flush()

    with pytest.raises(IntegrityError) as erro:
        with db.begin_nested():
            db.add(
                StockMovement(
                    produto_id=detergente.id, lote_id=lote.id, tipo="entrada", quantidade=1, usuario_id=admin.id
                )
            )
            db.flush()
    assert erro.value.orig.diag.constraint_name == "fk_stock_movements_lote_id_produto_id_batches"


# --- Saídas de estoque (Fase 7) ---


def saida(client, token, codigo_barras, quantidade):
    return client.post(
        "/stock/exits", headers=auth(token), json={"codigo_barras": codigo_barras, "quantidade": quantidade}
    )


def historico(client, token, produto_id) -> list[dict]:
    resposta = client.get(f"/products/{produto_id}/movements", headers=auth(token))
    assert resposta.status_code == 200
    return resposta.json()


def lote_direto(db, produto, quantidade, validade=None) -> Batch:
    """Cria o lote direto no banco; a entrada recusaria validade vencida (RN-31).

    commit (e não só flush): uma saída recusada faz rollback e desfaria um lote pendente.
    """
    lote = Batch(produto_id=produto.id, validade=validade, quantidade=quantidade)
    db.add(lote)
    db.commit()
    return lote


def test_ct10_saida_com_saldo_suficiente(client, token_admin, admin, detergente):
    """CT-10 / RN-09: saldo -3 e saída no histórico."""
    entrada(client, token_admin, detergente.codigo_barras, 10)

    resposta = saida(client, token_admin, detergente.codigo_barras, 3)
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["quantidade"] == 3
    assert corpo["saldo_total"] == 7
    assert corpo["usuario_id"] == admin.id

    assert saldo(client, token_admin, detergente.id)["saldo_fisico"] == 7
    ultima = historico(client, token_admin, detergente.id)[0]
    assert (ultima["tipo"], ultima["quantidade"], ultima["usuario_nome"]) == ("saida", 3, "Admin")


def test_ct11_saida_maior_que_o_saldo(client, token_admin, detergente):
    """CT-11 / RN-09: 409 e o saldo continua igual."""
    entrada(client, token_admin, detergente.codigo_barras, 5)

    resposta = saida(client, token_admin, detergente.codigo_barras, 6)
    assert resposta.status_code == 409
    assert "Saldo insuficiente" in resposta.json()["detail"]
    assert saldo(client, token_admin, detergente.id)["saldo_fisico"] == 5


def test_ct12_saida_segue_fefo_entre_dois_lotes(client, db, token_admin, refrigerante):
    """CT-12 / RN-10: lote B entra antes, mas A vence antes; A zera e B fica com 7."""
    lote_b = entrada(client, token_admin, refrigerante.codigo_barras, 10, em_dias(60)).json()["lote_id"]
    lote_a = entrada(client, token_admin, refrigerante.codigo_barras, 5, em_dias(20)).json()["lote_id"]

    resposta = saida(client, token_admin, refrigerante.codigo_barras, 8)
    assert resposta.status_code == 201
    retiradas = [(lote["lote_id"], lote["quantidade"], lote["quantidade_lote"]) for lote in resposta.json()["lotes"]]
    assert retiradas == [(lote_a, 5, 0), (lote_b, 3, 7)]

    assert db.get(Batch, lote_a).quantidade == 0
    assert db.get(Batch, lote_b).quantidade == 7


def test_ct32_saida_de_produto_sem_validade_sai_do_lote_unico(client, db, token_admin, detergente):
    """CT-32 / RN-27."""
    lote_id = entrada(client, token_admin, detergente.codigo_barras, 10).json()["lote_id"]

    resposta = saida(client, token_admin, detergente.codigo_barras, 4)
    assert resposta.status_code == 201
    assert [(lote["lote_id"], lote["validade"]) for lote in resposta.json()["lotes"]] == [(lote_id, None)]
    assert db.query(Batch).filter(Batch.produto_id == detergente.id).count() == 1
    assert db.get(Batch, lote_id).quantidade == 6


def test_ct33_saida_nao_usa_lote_vencido(client, db, token_admin, refrigerante):
    """CT-33 / RN-36: o lote vencido vem antes no FEFO, mas não sai nem conta como disponível."""
    vencido = lote_direto(db, refrigerante, 5, service.hoje() - timedelta(days=1))
    valido = lote_direto(db, refrigerante, 4, service.hoje() + timedelta(days=30))

    # Saldo total é 9, mas só 4 estão disponíveis para saída
    assert saida(client, token_admin, refrigerante.codigo_barras, 5).status_code == 409

    resposta = saida(client, token_admin, refrigerante.codigo_barras, 3)
    assert resposta.status_code == 201
    assert [lote["lote_id"] for lote in resposta.json()["lotes"]] == [valido.id]
    db.refresh(vencido)
    db.refresh(valido)
    assert (vencido.quantidade, valido.quantidade) == (5, 1)


def test_ct34_saida_em_dois_lotes_gera_duas_movimentacoes(client, db, token_admin, operador, token_operador, refrigerante):
    """CT-34: uma movimentação de saída por lote atingido, com o usuário logado."""
    lote_1 = entrada(client, token_admin, refrigerante.codigo_barras, 2, em_dias(10)).json()["lote_id"]
    lote_2 = entrada(client, token_admin, refrigerante.codigo_barras, 6, em_dias(40)).json()["lote_id"]

    resposta = saida(client, token_operador, refrigerante.codigo_barras, 5)
    assert resposta.status_code == 201
    corpo = resposta.json()

    saidas = db.query(StockMovement).filter(StockMovement.tipo == "saida").order_by(StockMovement.id).all()
    assert [(mov.lote_id, mov.quantidade, mov.usuario_id) for mov in saidas] == [
        (lote_1, 2, operador.id),
        (lote_2, 3, operador.id),
    ]
    assert [lote["movimentacao_id"] for lote in corpo["lotes"]] == [mov.id for mov in saidas]

    saidas_no_historico = [mov for mov in historico(client, token_admin, refrigerante.id) if mov["tipo"] == "saida"]
    assert sorted((mov["lote_id"], mov["quantidade"]) for mov in saidas_no_historico) == [(lote_1, 2), (lote_2, 3)]


def test_ct35_saida_com_quantidade_zero_ou_negativa(client, db, token_admin, detergente):
    """CT-35 / RN-07."""
    entrada(client, token_admin, detergente.codigo_barras, 10)
    for quantidade in (0, -3):
        assert saida(client, token_admin, detergente.codigo_barras, quantidade).status_code == 422
    assert db.query(StockMovement).filter(StockMovement.tipo == "saida").count() == 0
    assert saldo(client, token_admin, detergente.id)["saldo_fisico"] == 10


def test_ct35_service_tambem_recusa_quantidade_invalida(db, admin, detergente):
    with pytest.raises(service.QuantidadeInvalidaError):
        service.registrar_saida(db, admin, detergente.codigo_barras, 0)


def test_ct36_saida_recusada_nao_altera_lotes_nem_cria_movimentacao(client, db, token_admin, refrigerante):
    """CT-36 / RN-09: o primeiro lote cobriria parte do pedido, mas nada muda."""
    entrada(client, token_admin, refrigerante.codigo_barras, 3, em_dias(10))
    entrada(client, token_admin, refrigerante.codigo_barras, 4, em_dias(40))
    antes = {lote.id: lote.quantidade for lote in db.query(Batch).all()}

    assert saida(client, token_admin, refrigerante.codigo_barras, 8).status_code == 409

    db.expire_all()
    assert {lote.id: lote.quantidade for lote in db.query(Batch).all()} == antes
    assert db.query(StockMovement).filter(StockMovement.tipo == "saida").count() == 0


def test_operador_registra_saida(client, operador, token_admin, token_operador, detergente):
    """RN-32."""
    entrada(client, token_admin, detergente.codigo_barras, 5)
    resposta = saida(client, token_operador, detergente.codigo_barras, 2)
    assert resposta.status_code == 201
    assert resposta.json()["usuario_id"] == operador.id


def test_saida_sem_token_devolve_401(client, db, detergente):
    """RN-18."""
    resposta = client.post("/stock/exits", json={"codigo_barras": detergente.codigo_barras, "quantidade": 1})
    assert resposta.status_code == 401
    assert db.query(StockMovement).count() == 0


def test_saida_com_codigo_de_barras_inexistente_devolve_404(client, db, token_admin):
    assert saida(client, token_admin, "0000000000000", 1).status_code == 404
    assert db.query(StockMovement).count() == 0


def test_lote_que_zera_continua_existindo(client, db, token_admin, detergente):
    """RN-37: o lote fica com 0, o histórico aponta para ele e ele sai da lista de lotes com saldo."""
    lote_id = entrada(client, token_admin, detergente.codigo_barras, 4).json()["lote_id"]

    resposta = saida(client, token_admin, detergente.codigo_barras, 4)
    assert resposta.status_code == 201
    assert resposta.json()["saldo_total"] == 0

    lote = db.get(Batch, lote_id)
    assert lote is not None and lote.quantidade == 0
    assert saldo(client, token_admin, detergente.id) == {"produto_id": detergente.id, "saldo_fisico": 0, "saldo_disponivel": 0, "lotes": []}
    assert [mov["lote_id"] for mov in historico(client, token_admin, detergente.id)] == [lote_id, lote_id]

    # Nova entrada volta a somar no mesmo lote (RN-27)
    assert entrada(client, token_admin, detergente.codigo_barras, 2).json()["lote_id"] == lote_id


def test_fuso_de_brasilia_decide_se_lote_que_vence_hoje_pode_sair(client, db, token_admin, refrigerante, monkeypatch):
    """RN-36: lote com validade 26/10 sai até 23:59 de 26/10 em Brasília, mesmo que em UTC já seja 27/10."""
    lote = lote_direto(db, refrigerante, 10, date(2026, 10, 26))

    # 27/10 02:59 UTC = 26/10 23:59 em Brasília: vence hoje, ainda pode sair
    monkeypatch.setattr(clock, "_agora_utc", lambda: datetime(2026, 10, 27, 2, 59, tzinfo=timezone.utc))
    resposta = saida(client, token_admin, refrigerante.codigo_barras, 3)
    assert resposta.status_code == 201
    assert resposta.json()["lotes"][0]["lote_id"] == lote.id

    # 27/10 03:00 UTC = 27/10 00:00 em Brasília: vencido
    monkeypatch.setattr(clock, "_agora_utc", lambda: datetime(2026, 10, 27, 3, 0, tzinfo=timezone.utc))
    assert saida(client, token_admin, refrigerante.codigo_barras, 1).status_code == 409
    db.refresh(lote)
    assert lote.quantidade == 7


# --- Ajustes e histórico imutável (Fase 8) ---


def ajuste(client, token, lote_id, saldo_contado, motivo="Contagem do inventário"):
    dados = {"lote_id": lote_id, "saldo_contado": saldo_contado}
    if motivo is not None:
        dados["motivo"] = motivo
    return client.post("/stock/adjustments", headers=auth(token), json=dados)


def test_ct13_admin_ajusta_estoque_com_motivo(client, db, token_admin, admin, detergente):
    """CT-13 / RN-11, RN-33: saldo corrigido para o contado e ajuste registrado."""
    lote_id = entrada(client, token_admin, detergente.codigo_barras, 10).json()["lote_id"]

    resposta = ajuste(client, token_admin, lote_id, 7, "Quebra na prateleira")
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert (corpo["saldo_anterior"], corpo["saldo_novo"], corpo["quantidade"]) == (10, 7, -3)
    assert corpo["saldo_total"] == 7
    assert corpo["usuario_id"] == admin.id

    assert db.get(Batch, lote_id).quantidade == 7
    mov = db.get(StockMovement, corpo["movimentacao_id"])
    assert (mov.tipo, mov.quantidade, mov.motivo, mov.lote_id) == ("ajuste", -3, "Quebra na prateleira", lote_id)


def test_ct14_ajuste_sem_motivo(client, db, token_admin, detergente):
    """CT-14 / RN-11: sem motivo, vazio, só espaços ou longo demais é recusado e nada muda."""
    lote_id = entrada(client, token_admin, detergente.codigo_barras, 10).json()["lote_id"]

    for motivo in (None, "", "   ", "x" * 256):
        assert ajuste(client, token_admin, lote_id, 7, motivo).status_code == 422
    assert db.get(Batch, lote_id).quantidade == 10
    assert db.query(StockMovement).filter(StockMovement.tipo == "ajuste").count() == 0


def test_ct14_service_tambem_recusa_motivo_vazio(db, admin, detergente):
    lote = lote_direto(db, detergente, 10)
    with pytest.raises(service.MotivoObrigatorioError):
        service.registrar_ajuste(db, admin, lote.id, 7, "   ")


def test_ct15_nao_existe_rota_para_editar_ou_apagar_movimentacao(client, db, token_admin, detergente):
    """CT-15 / RN-12: nenhuma rota altera ou apaga movimentações, e a movimentação continua igual."""
    mov_id = entrada(client, token_admin, detergente.codigo_barras, 10).json()["movimentacao_id"]

    for caminho in (
        f"/stock/movements/{mov_id}",
        f"/stock/entries/{mov_id}",
        f"/stock/exits/{mov_id}",
        f"/stock/adjustments/{mov_id}",
        f"/products/{detergente.id}/movements/{mov_id}",
        f"/products/{detergente.id}/movements",
    ):
        for metodo in ("PUT", "PATCH", "DELETE"):
            resposta = client.request(metodo, caminho, headers=auth(token_admin), json={"quantidade": 999})
            assert resposta.status_code in (404, 405), (metodo, caminho)

    # Nenhuma rota de movimentações aceita outro método além de GET
    for rota in app.routes:
        if "movement" in getattr(rota, "path", ""):
            assert rota.methods <= {"GET", "HEAD"}, rota.path

    linhas = historico(client, token_admin, detergente.id)
    assert [(linha["id"], linha["quantidade"]) for linha in linhas] == [(mov_id, 10)]


def test_ct37_operador_tenta_fazer_ajuste(client, db, token_admin, token_operador, detergente):
    """CT-37 / RN-02, RN-32: 403 e nada muda."""
    lote_id = entrada(client, token_admin, detergente.codigo_barras, 10).json()["lote_id"]

    resposta = ajuste(client, token_operador, lote_id, 7)
    assert resposta.status_code == 403
    assert db.get(Batch, lote_id).quantidade == 10
    assert db.query(StockMovement).filter(StockMovement.tipo == "ajuste").count() == 0


def test_ct38_ajuste_com_saldo_contado_igual_ao_atual(client, db, token_admin, detergente):
    """CT-38 / RN-35: 409 e nenhuma movimentação."""
    lote_id = entrada(client, token_admin, detergente.codigo_barras, 10).json()["lote_id"]

    resposta = ajuste(client, token_admin, lote_id, 10)
    assert resposta.status_code == 409
    assert "nada a ajustar" in resposta.json()["detail"]
    assert db.query(StockMovement).filter(StockMovement.tipo == "ajuste").count() == 0


def test_ct39_ajuste_zero_da_baixa_em_lote_vencido(client, db, token_admin, refrigerante):
    """CT-39 / RN-38, RN-37: o lote vencido zera, continua existindo e o ajuste vai para o histórico."""
    vencido = lote_direto(db, refrigerante, 5, service.hoje() - timedelta(days=3))

    resposta = ajuste(client, token_admin, vencido.id, 0, "vencido")
    assert resposta.status_code == 201
    assert resposta.json()["quantidade"] == -5

    db.refresh(vencido)
    assert vencido.quantidade == 0
    linha = historico(client, token_admin, refrigerante.id)[0]
    assert (linha["tipo"], linha["lote_id"], linha["quantidade"], linha["motivo"]) == ("ajuste", vencido.id, -5, "vencido")


def test_ct40_historico_mostra_saldos_e_motivo_do_ajuste(client, token_admin, detergente):
    """CT-40 / RN-34: a linha de ajuste traz saldo anterior, saldo novo e motivo; as outras ficam sem saldos."""
    lote_id = entrada(client, token_admin, detergente.codigo_barras, 10).json()["lote_id"]
    ajuste(client, token_admin, lote_id, 12, "Sobra na contagem")

    linhas = historico(client, token_admin, detergente.id)
    assert [linha["tipo"] for linha in linhas] == ["ajuste", "entrada"]
    linha_ajuste, linha_entrada = linhas
    assert linha_ajuste["saldo_anterior"] == 10
    assert linha_ajuste["saldo_novo"] == 12
    assert linha_ajuste["motivo"] == "Sobra na contagem"
    assert linha_ajuste["quantidade"] == 2
    assert (linha_entrada["saldo_anterior"], linha_entrada["saldo_novo"], linha_entrada["motivo"]) == (None, None, None)


def test_ct41_banco_recusa_update_e_delete_em_movimentacoes(client, db, token_admin, detergente):
    """CT-41 / RN-12: o trigger recusa UPDATE e DELETE, mesmo com SQL direto."""
    mov_id = entrada(client, token_admin, detergente.codigo_barras, 10).json()["movimentacao_id"]

    for sql in (
        "UPDATE stock_movements SET quantidade = 999 WHERE id = :id",
        "DELETE FROM stock_movements WHERE id = :id",
    ):
        with pytest.raises(DBAPIError) as erro:
            with db.begin_nested():
                db.execute(text(sql), {"id": mov_id})
        assert "imutável" in str(erro.value.orig)

    quantidade = db.execute(text("SELECT quantidade FROM stock_movements WHERE id = :id"), {"id": mov_id})
    assert quantidade.scalar_one() == 10


# --- Testes extras da Fase 8 ---


def test_ajuste_que_aumenta_o_saldo(client, db, token_admin, refrigerante):
    """RN-33: a diferença positiva soma no lote."""
    lote_id = entrada(client, token_admin, refrigerante.codigo_barras, 4, em_dias(60)).json()["lote_id"]

    corpo = ajuste(client, token_admin, lote_id, 9, "Caixa achada no depósito").json()
    assert (corpo["saldo_anterior"], corpo["saldo_novo"], corpo["quantidade"]) == (4, 9, 5)
    assert db.get(Batch, lote_id).quantidade == 9


def test_ajuste_sem_token_devolve_401(client, db, detergente):
    """RN-18."""
    lote = lote_direto(db, detergente, 10)
    resposta = client.post("/stock/adjustments", json={"lote_id": lote.id, "saldo_contado": 5, "motivo": "x"})
    assert resposta.status_code == 401
    db.refresh(lote)
    assert lote.quantidade == 10


def test_saldo_do_produto_reflete_o_ajuste(client, token_admin, refrigerante):
    """O GET /products/{id}/stock soma os lotes já com o ajuste."""
    lote_a = entrada(client, token_admin, refrigerante.codigo_barras, 5, em_dias(30)).json()["lote_id"]
    entrada(client, token_admin, refrigerante.codigo_barras, 10, em_dias(60))

    ajuste(client, token_admin, lote_a, 2, "Avaria")
    estoque = saldo(client, token_admin, refrigerante.id)
    assert estoque["saldo_fisico"] == 12
    assert (estoque["lotes"][0]["id"], estoque["lotes"][0]["quantidade"]) == (lote_a, 2)


def test_ajuste_em_lote_inexistente_devolve_404(client, db, token_admin):
    assert ajuste(client, token_admin, 999999, 5).status_code == 404
    assert db.query(StockMovement).count() == 0


def test_ajuste_com_saldo_contado_negativo(client, db, admin, token_admin, detergente):
    """RN-35: recusado no schema (422) e no service."""
    lote = lote_direto(db, detergente, 10)
    assert ajuste(client, token_admin, lote.id, -1).status_code == 422
    with pytest.raises(service.QuantidadeInvalidaError):
        service.registrar_ajuste(db, admin, lote.id, -1, "Contagem")
    db.refresh(lote)
    assert lote.quantidade == 10


def test_banco_recusa_ajuste_com_saldos_incoerentes(db, admin, detergente):
    """RN-34/RN-35 no banco: no ajuste, saldos obrigatórios, não negativos e coerentes com a diferença.
    Entrada e saída continuam exigindo quantidade > 0."""
    lote = lote_direto(db, detergente, 10)
    saldos = "ck_stock_movements_saldos_ajuste"
    quantidade = "ck_stock_movements_quantidade"
    invalidos = [
        (saldos, dict(tipo="ajuste", quantidade=-3, motivo="x", saldo_anterior=10, saldo_novo=8)),
        (saldos, dict(tipo="ajuste", quantidade=-3, motivo="x")),
        (saldos, dict(tipo="ajuste", quantidade=-3, motivo="x", saldo_anterior=2, saldo_novo=-1)),
        (quantidade, dict(tipo="ajuste", quantidade=0, motivo="x", saldo_anterior=10, saldo_novo=10)),
        (quantidade, dict(tipo="entrada", quantidade=-1)),
        (quantidade, dict(tipo="saida", quantidade=0)),
    ]
    for constraint, campos in invalidos:
        with pytest.raises(IntegrityError) as erro:
            with db.begin_nested():
                db.add(StockMovement(produto_id=detergente.id, lote_id=lote.id, usuario_id=admin.id, **campos))
                db.flush()
        assert erro.value.orig.diag.constraint_name == constraint, campos
