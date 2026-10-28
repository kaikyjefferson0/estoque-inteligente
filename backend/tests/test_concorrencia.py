"""CT-62 a CT-64: movimentações simultâneas no mesmo produto, gravando de verdade.

Cada requisição roda numa thread, com seu próprio TestClient e sua própria sessão
(conexão separada). Para a disputa acontecer sempre, e não só quando o tempo ajuda,
o teste segura a trava consultiva do produto (a primeira que toda movimentação pega),
espera até as requisições estarem paradas nela e só então solta.

O histórico não aceita DELETE (RN-12), então no fim do módulo o banco _test é recriado.
"""
import time
from collections.abc import Generator
from datetime import timedelta
from threading import Thread

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.main import app
from app.models.batch import Batch
from app.models.stock_movement import StockMovement
from app.services import alerts as alertas
from app.services import stock as service
from app.services.products import criar_produto
from app.services.users import criar_usuario
from tests.conftest import recriar_banco

pytestmark = pytest.mark.concorrencia

ESPERA_MAXIMA = 15  # segundos


@pytest.fixture(scope="module")
def sessoes(engine) -> Generator[sessionmaker, None, None]:
    """Sessões que gravam de verdade; com TEST_APP_DATABASE_URL, como o usuário da aplicação (RN-50)."""
    engine_api = create_engine(settings.TEST_APP_DATABASE_URL) if settings.TEST_APP_DATABASE_URL else engine
    fabrica = sessionmaker(bind=engine_api, autoflush=False, expire_on_commit=False)

    def get_db_real() -> Generator[Session, None, None]:
        sessao = fabrica()
        try:
            yield sessao
        finally:
            sessao.close()

    app.dependency_overrides[get_db] = get_db_real
    try:
        yield fabrica
    finally:
        app.dependency_overrides.clear()
        if engine_api is not engine:
            engine_api.dispose()
        recriar_banco(engine)


@pytest.fixture(scope="module")
def token(sessoes) -> str:
    with sessoes() as sessao:
        usuario = criar_usuario(sessao, nome="Concorrência", email="concorrencia@teste.com", senha="senha-concorrencia-123", perfil="admin")
    return create_access_token(usuario.id)


def novo_produto(sessoes, codigo_barras: str, controla_validade: bool = False):
    with sessoes() as sessao:
        return criar_produto(
            sessao,
            nome=f"Produto {codigo_barras}",
            codigo_barras=codigo_barras,
            estoque_minimo=1,
            controla_validade=controla_validade,
            dias_alerta_validade=30 if controla_validade else None,
        )


def _requisicoes_paradas_na_trava(engine) -> int:
    with engine.connect() as conexao:
        return conexao.scalar(
            text(
                "SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND NOT granted"
                " AND database = (SELECT oid FROM pg_database WHERE datname = current_database())"
            )
        )


def disputar(engine, sessoes, token: str, produto_id: int, requisicoes: list[tuple[str, dict]]) -> list:
    """Dispara as requisições ao mesmo tempo, todas paradas na trava do produto, e devolve as respostas."""
    respostas: list = [None] * len(requisicoes)

    def enviar(indice: int, caminho: str, dados: dict) -> None:
        try:
            respostas[indice] = TestClient(app).post(caminho, headers={"Authorization": f"Bearer {token}"}, json=dados)
        except Exception as erro:  # aparece na asserção, em vez de sumir na thread
            respostas[indice] = erro

    with sessoes() as trava:
        alertas.travar_produto(trava, produto_id)
        threads = [Thread(target=enviar, args=(i, *req), daemon=True) for i, req in enumerate(requisicoes)]
        for thread in threads:
            thread.start()

        limite = time.monotonic() + ESPERA_MAXIMA
        while _requisicoes_paradas_na_trava(engine) < len(requisicoes):
            assert time.monotonic() < limite, "As requisições não chegaram juntas à trava do produto."
            assert all(thread.is_alive() for thread in threads), f"Requisição terminou antes da trava: {respostas}"
            time.sleep(0.02)
        trava.commit()  # solta a trava: as requisições disputam entre si

    for thread in threads:
        thread.join(ESPERA_MAXIMA)
        assert not thread.is_alive(), "Requisição presa (possível deadlock)."
    return respostas


def lotes_e_movimentacoes(sessoes, produto_id: int) -> tuple[list[Batch], list[StockMovement]]:
    with sessoes() as sessao:
        lotes = list(sessao.scalars(select(Batch).where(Batch.produto_id == produto_id)))
        movimentacoes = list(sessao.scalars(select(StockMovement).where(StockMovement.produto_id == produto_id)))
    return lotes, movimentacoes


def test_ct62_duas_entradas_simultaneas_no_mesmo_lote_somam(engine, sessoes, token):
    """CT-62 / RN-28: as duas criam o mesmo lote novo; nada se perde e não nasce lote duplicado."""
    produto = novo_produto(sessoes, "7891000006201", controla_validade=True)
    validade = (service.hoje() + timedelta(days=90)).isoformat()

    respostas = disputar(
        engine,
        sessoes,
        token,
        produto.id,
        [
            ("/stock/entries", {"codigo_barras": produto.codigo_barras, "quantidade": 7, "validade": validade}),
            ("/stock/entries", {"codigo_barras": produto.codigo_barras, "quantidade": 5, "validade": validade}),
        ],
    )

    assert [r.status_code for r in respostas] == [201, 201], respostas
    lotes, movimentacoes = lotes_e_movimentacoes(sessoes, produto.id)
    assert len(lotes) == 1
    assert lotes[0].quantidade == 12
    assert sorted(m.quantidade for m in movimentacoes if m.tipo == "entrada") == [5, 7]
    assert {r.json()["lote_id"] for r in respostas} == {lotes[0].id}


def test_ct63_duas_saidas_que_juntas_passam_do_saldo(engine, sessoes, token):
    """CT-63 / RN-09: uma atendida, a outra 409; o saldo nunca fica negativo."""
    produto = novo_produto(sessoes, "7891000006301")
    cliente = TestClient(app)
    entrada = cliente.post(
        "/stock/entries",
        headers={"Authorization": f"Bearer {token}"},
        json={"codigo_barras": produto.codigo_barras, "quantidade": 10},
    )
    assert entrada.status_code == 201

    respostas = disputar(
        engine,
        sessoes,
        token,
        produto.id,
        [
            ("/stock/exits", {"codigo_barras": produto.codigo_barras, "quantidade": 7}),
            ("/stock/exits", {"codigo_barras": produto.codigo_barras, "quantidade": 7}),
        ],
    )

    assert sorted(r.status_code for r in respostas) == [201, 409], respostas
    lotes, movimentacoes = lotes_e_movimentacoes(sessoes, produto.id)
    assert all(lote.quantidade >= 0 for lote in lotes)
    assert sum(lote.quantidade for lote in lotes) == 3
    # CT-36: a recusada não grava nada
    assert [m.quantidade for m in movimentacoes if m.tipo == "saida"] == [7]


def test_ct64_entrada_e_saida_simultaneas_deixam_saldo_correto(engine, sessoes, token):
    """CT-64 / RN-09, RN-27: saldo final = inicial + entrada − saída, em qualquer ordem."""
    produto = novo_produto(sessoes, "7891000006401")
    cliente = TestClient(app)
    entrada = cliente.post(
        "/stock/entries",
        headers={"Authorization": f"Bearer {token}"},
        json={"codigo_barras": produto.codigo_barras, "quantidade": 10},
    )
    assert entrada.status_code == 201

    respostas = disputar(
        engine,
        sessoes,
        token,
        produto.id,
        [
            ("/stock/entries", {"codigo_barras": produto.codigo_barras, "quantidade": 5}),
            ("/stock/exits", {"codigo_barras": produto.codigo_barras, "quantidade": 8}),
        ],
    )

    assert [r.status_code for r in respostas] == [201, 201], respostas
    lotes, movimentacoes = lotes_e_movimentacoes(sessoes, produto.id)
    assert len(lotes) == 1
    assert lotes[0].quantidade == 10 + 5 - 8
    assert sorted(m.tipo for m in movimentacoes) == ["entrada", "entrada", "saida"]
