from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

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
    assert saldo(client, token_admin, refrigerante.id)["saldo_total"] == 0

    resposta = entrada(client, token_admin, refrigerante.codigo_barras, 10, em_dias(60))
    assert resposta.status_code == 201
    assert resposta.json()["saldo_total"] == 10

    assert saldo(client, token_admin, refrigerante.id)["saldo_total"] == 10
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


def test_saldo_total_e_soma_dos_lotes_em_ordem_fefo(client, token_admin, refrigerante):
    for quantidade, dias in ((5, 90), (8, 30), (2, 60)):
        entrada(client, token_admin, refrigerante.codigo_barras, quantidade, em_dias(dias))

    estoque = saldo(client, token_admin, refrigerante.id)
    assert estoque["saldo_total"] == sum(lote["quantidade"] for lote in estoque["lotes"]) == 15
    assert [lote["validade"] for lote in estoque["lotes"]] == [em_dias(30), em_dias(60), em_dias(90)]


def test_historico_do_mais_recente_para_o_mais_antigo(client, token_admin, detergente):
    ids = [entrada(client, token_admin, detergente.codigo_barras, q).json()["movimentacao_id"] for q in (1, 2, 3)]
    historico = client.get(f"/products/{detergente.id}/movements", headers=auth(token_admin)).json()
    assert [mov["id"] for mov in historico] == list(reversed(ids))
    assert [mov["quantidade"] for mov in historico] == [3, 2, 1]


def test_hoje_e_o_dia_em_brasilia_e_nao_em_utc(client, token_admin, refrigerante, monkeypatch):
    """RN-31: 27/10 01:00 UTC ainda é 26/10 22:00 em Brasília; validade 26/10 vence hoje e é aceita."""
    monkeypatch.setattr(service, "_agora_utc", lambda: datetime(2026, 10, 27, 1, 0, tzinfo=timezone.utc))
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
