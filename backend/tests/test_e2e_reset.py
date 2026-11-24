"""CT-111 a CT-114: rota de reset do teste de ponta a ponta (RN-67)."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from psycopg.errors import DeadlockDetected, LockNotAvailable
from sqlalchemy import func, select, text
from sqlalchemy.exc import OperationalError

from app.core.config import settings
from app.core.database import Base
from app.core.limiter import contagem_demo, limiter
from app.core.security import create_access_token, verify_password
from app.main import criar_app
from app.models.demo_reset import DemoReset
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier
from app.models.user import User
from app.services import e2e_reset, stock

URL_APP = "postgresql+psycopg://estoque_app:x@localhost:5432/estoque_e2e"
URL_DONO = "postgresql+psycopg://estoque:y@localhost:5432/estoque_e2e"
SENHAS = e2e_reset.Senhas(admin="senha-do-admin-e2e", operador="senha-do-operador-e2e")

CABECALHO = {"X-E2E-Reset": "1"}


@pytest.fixture
def ambiente(monkeypatch):
    """Ambiente em que o reset é permitido; cada teste estraga uma condição."""

    def definir(**valores):
        for nome, valor in valores.items():
            monkeypatch.setattr(settings, nome, valor)

    definir(
        E2E_RESET=True,
        APP_ENV="development",
        DATABASE_URL=URL_APP,
        MIGRATIONS_DATABASE_URL=URL_DONO,
        MIGRATIONS_DATABASE_URL_DEFINIDA=True,
        E2E_SENHA_ADMIN=SENHAS.admin,
        E2E_SENHA_OPERADOR=SENHAS.operador,
    )
    return definir


def pedir_reset():
    # Sem "with": o ciclo de vida (que em production confere o banco) não roda
    return TestClient(criar_app()).post("/_test/reset", headers=CABECALHO)


# --- CT-111: a rota não existe fora do ambiente do teste ---

BANCO_COMUM = "postgresql+psycopg://estoque:y@localhost:5432/estoque_inteligente"


@pytest.mark.parametrize(
    "estrago",
    [
        pytest.param({"E2E_RESET": False}, id="sem-a-flag"),
        pytest.param({"DATABASE_URL": BANCO_COMUM, "MIGRATIONS_DATABASE_URL": BANCO_COMUM}, id="banco-sem-e2e"),
        pytest.param({"DATABASE_URL": BANCO_COMUM}, id="banco-da-api-sem-e2e"),
        pytest.param({"MIGRATIONS_DATABASE_URL": BANCO_COMUM}, id="banco-do-dono-sem-e2e"),
        pytest.param({"MIGRATIONS_DATABASE_URL": URL_DONO.replace("localhost", "outro-servidor")}, id="outro-servidor"),
        pytest.param({"MIGRATIONS_DATABASE_URL": URL_DONO + "?dbname=estoque_inteligente"}, id="banco-trocado-na-query"),
        pytest.param({"MIGRATIONS_DATABASE_URL": URL_DONO.replace("5432", "5433")}, id="outra-porta"),
        pytest.param({"MIGRATIONS_DATABASE_URL": URL_DONO.replace("5432", "porta")}, id="porta-invalida"),
        pytest.param({"MIGRATIONS_DATABASE_URL": URL_DONO.replace("estoque_e2e", "outro_e2e")}, id="outro-banco-e2e"),
        pytest.param({"MIGRATIONS_DATABASE_URL": "não é uma url"}, id="url-invalida"),
        pytest.param({"MIGRATIONS_DATABASE_URL_DEFINIDA": False}, id="sem-a-url-do-dono"),
        pytest.param({"APP_ENV": "production"}, id="production"),
    ],
)
def test_ct111_rota_nao_existe_sem_as_condicoes(ambiente, monkeypatch, estrago):
    chamadas = []
    monkeypatch.setattr(e2e_reset, "recriar_dados", lambda *_: chamadas.append(1))
    ambiente(**estrago)

    assert pedir_reset().status_code == 404
    # A trava do service vale mesmo se alguém registrar a rota à mão
    with pytest.raises(e2e_reset.ResetRecusadoError):
        e2e_reset.resetar(settings)
    assert chamadas == []


def test_ct111_rota_nao_existe_na_api_padrao():
    from app.main import app

    assert TestClient(app).post("/_test/reset", headers=CABECALHO).status_code == 404


def test_ct111_rota_existe_com_as_condicoes_e_fica_fora_do_openapi(ambiente, monkeypatch):
    monkeypatch.setattr(e2e_reset, "resetar", lambda config: None)

    assert pedir_reset().status_code == 204
    assert "/_test/reset" not in criar_app().openapi()["paths"]


def test_ct111_sem_o_cabecalho_e_recusado(ambiente, monkeypatch):
    """Um POST simples de outra página (sem preflight) não apaga nada, e o CORS não libera o cabeçalho."""
    chamadas = []
    monkeypatch.setattr(e2e_reset, "resetar", chamadas.append)
    client = TestClient(criar_app())

    assert client.post("/_test/reset").status_code == 403
    preflight = client.options(
        "/_test/reset",
        headers={
            "Origin": settings.CORS_ORIGINS[0],
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "x-e2e-reset",
        },
    )
    assert preflight.status_code == 400
    assert chamadas == []


@pytest.mark.parametrize("senha", ["", "curta", "x" * 129])
@pytest.mark.parametrize("variavel", ["E2E_SENHA_ADMIN", "E2E_SENHA_OPERADOR"])
def test_ct111_sem_as_senhas_a_api_nao_sobe(ambiente, variavel, senha):
    ambiente(**{variavel: senha})
    with pytest.raises(e2e_reset.ResetRecusadoError, match=variavel) as erro:
        criar_app()
    if senha:
        assert senha not in str(erro.value)


def test_ct111_senhas_nao_aparecem_no_repr():
    assert SENHAS.admin not in repr(SENHAS) and SENHAS.operador not in repr(SENHAS)


# --- CT-112: o banco conectado é conferido antes do TRUNCATE ---


def test_ct112_recusa_pelo_nome_do_banco_conectado(ambiente, db, monkeypatch, fornecedor):
    """As URLs dizem _e2e, mas a conexão cai no banco _test: nada é apagado."""

    monkeypatch.setattr(e2e_reset, "criar_engine", lambda *_, **__: _EngineFalso(db.connection()))
    with pytest.raises(e2e_reset.ResetRecusadoError, match="não termina em _e2e"):
        e2e_reset.resetar(settings)
    assert db.scalar(select(func.count()).select_from(Supplier)) == 1


class _EngineFalso:
    """engine.begin() devolvendo uma conexão pronta."""

    def __init__(self, conexao):
        self.conexao = conexao

    def begin(self):
        return self

    def __enter__(self):
        return self.conexao

    def __exit__(self, *_):
        return False

    def dispose(self):
        pass


# --- CT-113: o que o reset deixa no banco ---


@pytest.fixture
def depois_do_reset(db, admin, refrigerante):
    """Um banco com histórico (RN-12), resetado dentro da transação do teste."""
    stock.registrar_entrada(db, admin, refrigerante.codigo_barras, 5, datetime.now(timezone.utc).date() + timedelta(days=30))
    assert db.scalar(select(func.count()).select_from(StockMovement)) == 1
    token_antigo = create_access_token(1)

    e2e_reset.recriar_dados(db.connection(), SENHAS)
    db.expire_all()
    db.expunge_all()
    return token_antigo


def test_ct113_so_o_seed_fica_no_banco_com_os_ids_do_comeco(db, depois_do_reset):
    fornecedores = db.execute(select(Supplier.id, Supplier.nome, Supplier.cnpj).order_by(Supplier.id)).all()
    assert fornecedores == [
        (1, "Distribuidora Central", "11222333000181"),
        (2, "Atacado Boa Vista", "45987321000110"),
    ]
    assert db.execute(select(Product.id, Product.fornecedor_id)).all() == [(1, 1)]
    contas = db.scalars(select(User).order_by(User.id)).all()
    assert [(c.id, c.email, c.perfil, c.ativo) for c in contas] == [
        (1, e2e_reset.EMAIL_ADMIN, "admin", True),
        (2, e2e_reset.EMAIL_OPERADOR, "operador", True),
    ]
    assert verify_password(SENHAS.admin, contas[0].senha_hash)
    assert verify_password(SENHAS.operador, contas[1].senha_hash)
    # Histórico e lotes de antes sumiram: o trigger da RN-12 não dispara no TRUNCATE
    for nome in ("stock_movements", "batches"):
        assert db.scalar(select(func.count()).select_from(Base.metadata.tables[nome])) == 0


def test_ct113_reset_repetido_da_o_mesmo_estado(db, depois_do_reset):
    e2e_reset.recriar_dados(db.connection(), SENHAS)
    db.expire_all()
    assert db.scalars(select(Supplier.id).order_by(Supplier.id)).all() == [1, 2]
    assert db.scalars(select(User.id).order_by(User.id)).all() == [1, 2]


def test_ct113_token_de_antes_do_reset_deixa_de_valer(client, depois_do_reset):
    """Os ids recomeçam do 1: o token antigo apontaria para o admin novo."""

    def me(token):
        return client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code

    assert me(depois_do_reset) == 401
    assert me(create_access_token(1)) == 200


def test_ct113_a_data_da_recriacao_da_demo_nao_e_apagada(db):
    db.add(DemoReset(recriado_em=datetime.now(timezone.utc)))
    db.commit()
    e2e_reset.recriar_dados(db.connection(), SENHAS)
    assert db.scalar(select(func.count()).select_from(DemoReset)) == 1


def test_ct113_reset_zera_as_tentativas_de_login(ambiente, client, admin, monkeypatch):
    """RN-47: sem isto, o 11º teste do minuto não conseguiria entrar."""
    monkeypatch.setattr(e2e_reset, "criar_engine", lambda *_, **__: _EngineFalso(None))
    monkeypatch.setattr(e2e_reset, "conferir_banco", lambda _: None)
    monkeypatch.setattr(e2e_reset, "recriar_dados", lambda *_: None)
    limiter.reset()
    login = {"username": admin.email, "password": "errada-errada"}
    respostas = [client.post("/auth/login", data=login).status_code for _ in range(11)]
    assert respostas == [401] * 10 + [429]
    contagem_demo.incr("x", 60)  # RN-56
    e2e_reset.resetar(settings)
    assert contagem_demo.get("x") == 0
    assert client.post("/auth/login", data=login).status_code == 401


# --- CT-114: tabela em uso ---


def test_ct114_tabela_em_uso_desiste_sem_apagar(engine, monkeypatch):
    monkeypatch.setattr(e2e_reset, "LIMITE_DA_TRAVA", "200ms")
    with engine.connect() as ocupada, engine.connect() as outra:
        with engine.begin() as gravando:
            gravando.execute(text("INSERT INTO suppliers (nome) VALUES ('Ainda aqui')"))
        ocupada.execute(text("LOCK TABLE suppliers IN ACCESS SHARE MODE"))
        with pytest.raises(OperationalError) as erro:
            e2e_reset.recriar_dados(outra, SENHAS)
        assert isinstance(erro.value.orig, LockNotAvailable)
        outra.rollback()
        ocupada.rollback()
        # A linha continua lá (o DELETE a encontra) e o banco de teste volta a ficar vazio
        with engine.begin() as limpando:
            assert limpando.execute(text("DELETE FROM suppliers")).rowcount == 1


def test_ct114_falha_no_meio_do_seed_nao_apaga_nada(db, refrigerante, monkeypatch):
    """Os commits dos services ficam dentro da transação do reset."""

    def quebrar(_):
        raise RuntimeError("seed quebrado")

    monkeypatch.setattr(e2e_reset, "_criar_seed", quebrar)
    conexao = db.connection()
    reset = conexao.begin_nested()
    with pytest.raises(RuntimeError, match="seed quebrado"):
        e2e_reset.recriar_dados(conexao, SENHAS)
    reset.rollback()

    db.expire_all()
    assert db.scalars(select(Product.codigo_barras)).all() == ["7891000000001"]
    assert db.scalar(select(func.count()).select_from(User)) == 0


@pytest.mark.parametrize("motivo", [LockNotAvailable, DeadlockDetected])
def test_ct114_rota_responde_503(ambiente, monkeypatch, motivo):
    def ocupado(*_):
        raise OperationalError("TRUNCATE", {}, motivo())

    monkeypatch.setattr(e2e_reset, "criar_engine", lambda *_, **__: _EngineFalso(None))
    monkeypatch.setattr(e2e_reset, "conferir_banco", lambda _: None)
    monkeypatch.setattr(e2e_reset, "recriar_dados", ocupado)

    resposta = pedir_reset()
    assert resposta.status_code == 503
    assert "Nada foi apagado" in resposta.json()["detail"]
