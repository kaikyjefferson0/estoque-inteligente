"""Modo de demonstração (RN-53 a RN-55, CT-68 a CT-73).

Os testes de recriação apagam e recriam o banco _test de verdade (não cabem na transação
desfeita do conftest); a fixture `recriacao` devolve o banco limpo no fim. Eles não usam as
fixtures `db` e `client`: uma transação aberta seguraria as tabelas e o DROP esperaria para sempre.
"""

from collections.abc import Generator, Iterator
from contextlib import contextmanager
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import limiter as limiter_do_demo
from app.core import migracoes
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.main import app
from app.models.alert import Alert
from app.models.batch import Batch
from app.models.demo_reset import DemoReset
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier
from app.models.user import User
from app.scripts import reset_demo
from app.services import demo
from app.services.auth import autenticar
from app.services.suppliers import criar_fornecedor
from app.services.users import criar_usuario
from tests.conftest import recriar_banco

SENHA_DEMO = "senha-da-demo-123"
SENHA_DONO = "senha-do-dono-123"


def _config(engine) -> demo.ConfigDemo:
    return demo.ConfigDemo(
        url_dono=engine.url.render_as_string(hide_password=False),
        app_db_role=settings.APP_DB_ROLE,
        admin_email="dono@exemplo.com.br",
        admin_senha=SENHA_DONO,
        demo_email="demo@exemplo.com.br",
        demo_senha=SENHA_DEMO,
    )


@pytest.fixture
def recriacao(engine) -> Generator[demo.ConfigDemo, None, None]:
    try:
        yield _config(engine)
    finally:
        recriar_banco(engine)


@contextmanager
def _cliente(engine) -> Iterator[TestClient]:
    """Cliente da API com uma sessão de verdade (sem a transação desfeita do conftest)."""
    with Session(engine) as sessao:
        app.dependency_overrides[get_db] = lambda: sessao
        try:
            with TestClient(app) as cliente:
                yield cliente
        finally:
            app.dependency_overrides.clear()


def _contar(engine, consulta) -> int:
    with Session(engine) as db:
        return db.scalar(consulta)


def _settings(**valores) -> SimpleNamespace:
    """Settings de mentira com tudo certo; cada teste estraga um item."""
    base = {
        "DEMO_MODE": True,
        "MIGRATIONS_DATABASE_URL_DEFINIDA": True,
        "MIGRATIONS_DATABASE_URL": "postgresql+psycopg://dono:x@localhost/estoque",
        "APP_DB_ROLE": "estoque_app",
        "ADMIN_EMAIL": "dono@exemplo.com.br",
        "ADMIN_PASSWORD": SENHA_DONO,
        "DEMO_EMAIL": "demo@exemplo.com.br",
        "DEMO_PASSWORD": SENHA_DEMO,
    }
    return SimpleNamespace(**(base | valores))


def _conta_demo(db) -> User:
    usuario = criar_usuario(db, nome="Demo", email="demo@teste.com", senha=SENHA_DEMO, perfil="operador")
    usuario.demo = True
    db.commit()
    return usuario


# --- RN-53 ---


def test_ct68_conta_demo_nao_troca_a_propria_senha(client, db):
    usuario = _conta_demo(db)
    cabecalho = {"Authorization": f"Bearer {create_access_token(usuario.id)}"}
    resposta = client.post(
        "/auth/change-password", json={"senha_atual": SENHA_DEMO, "senha_nova": "outra-senha-123"}, headers=cabecalho
    )
    assert resposta.status_code == 403
    assert resposta.json()["detail"] == "A conta de demonstração não pode trocar a senha."
    assert autenticar(db, "demo@teste.com", SENHA_DEMO) is not None
    # O token continua valendo: nada foi trocado
    assert client.get("/auth/me", headers=cabecalho).json()["demo"] is True


def test_conta_demo_recusada_mesmo_com_senha_atual_errada(client, db):
    """RN-53: a recusa vem antes da conferência da senha, então não revela se ela estava certa."""
    cabecalho = {"Authorization": f"Bearer {create_access_token(_conta_demo(db).id)}"}
    resposta = client.post(
        "/auth/change-password", json={"senha_atual": "errada-123", "senha_nova": "outra-senha-123"}, headers=cabecalho
    )
    assert resposta.status_code == 403


def test_conta_comum_continua_trocando_a_senha(client, token_operador):
    resposta = client.post(
        "/auth/change-password",
        json={"senha_atual": "senha-do-operador-123", "senha_nova": "outra-senha-123"},
        headers={"Authorization": f"Bearer {token_operador}"},
    )
    assert resposta.status_code == 204


# --- RN-55 ---


def test_ct73_admin_nao_muda_o_perfil_da_conta_demo(client, db, token_admin):
    usuario = _conta_demo(db)
    cabecalho = {"Authorization": f"Bearer {token_admin}"}
    resposta = client.patch(f"/users/{usuario.id}", json={"perfil": "admin"}, headers=cabecalho)
    assert resposta.status_code == 409
    db.refresh(usuario)
    assert usuario.perfil == "operador"
    # Mudar o nome continua permitido
    assert client.patch(f"/users/{usuario.id}", json={"nome": "Visitante"}, headers=cabecalho).status_code == 200


def test_banco_recusa_conta_demo_admin(db):
    usuario = _conta_demo(db)
    with pytest.raises(IntegrityError, match="ck_users_demo_operador"):
        with db.begin_nested():
            db.execute(update(User).where(User.id == usuario.id).values(perfil="admin"))


# --- RN-54: configuração ---


@pytest.mark.parametrize(
    ("valores", "mensagem"),
    [
        ({"DEMO_MODE": False}, "DEMO_MODE"),
        ({"MIGRATIONS_DATABASE_URL_DEFINIDA": False}, "MIGRATIONS_DATABASE_URL"),
        ({"MIGRATIONS_DATABASE_URL": "postgresql+psycopg://estoque_app:x@localhost/estoque"}, "usuário da aplicação"),
        ({"ADMIN_EMAIL": ""}, "ADMIN_EMAIL"),
        ({"ADMIN_PASSWORD": ""}, "ADMIN_PASSWORD"),
        ({"DEMO_PASSWORD": ""}, "DEMO_PASSWORD"),
        ({"DEMO_PASSWORD": "curta"}, "DEMO_PASSWORD"),
        ({"ADMIN_EMAIL": "isso-nao-e-email"}, "ADMIN_EMAIL"),
        ({"ADMIN_EMAIL": "Demo@Exemplo.com.br"}, "diferentes"),
        ({"ADMIN_EMAIL": "revisor-ui@estoque.local"}, "revisor-ui"),
        ({"DEMO_EMAIL": "revisor-ui@estoque.local"}, "revisor-ui"),
    ],
)
def test_ct70_recriacao_recusada_sem_configuracao_completa(valores, mensagem):
    with pytest.raises(demo.DemoRecusadaError, match=mensagem):
        demo.ler_config_demo(_settings(**valores))


def test_um_usuario_so_aceita_a_mesma_url_nas_duas_variaveis():
    """Render: um usuário só, sem APP_DB_ROLE; DATABASE_URL e MIGRATIONS_DATABASE_URL vêm do mesmo banco."""
    url = "postgresql+psycopg://estoque:x@dpg-abc-a/estoque_inteligente"
    config = demo.ler_config_demo(_settings(MIGRATIONS_DATABASE_URL=url, APP_DB_ROLE=""))
    assert config.url_dono == url and config.app_db_role == ""


def test_ct70_mensagem_e_repr_nao_mostram_segredos():
    config = demo.ler_config_demo(_settings())
    assert SENHA_DONO not in repr(config) and "dono:x" not in repr(config)
    with pytest.raises(demo.DemoRecusadaError) as erro:
        demo.ler_config_demo(_settings(DEMO_PASSWORD="curta"))
    assert "curta" not in str(erro.value)


def test_ct70_comando_manual_recusa_sem_demo_mode_e_nao_toca_no_banco(monkeypatch, capsys):
    monkeypatch.setattr(reset_demo, "settings", _settings(DEMO_MODE=False))
    monkeypatch.setattr(demo, "recriar", lambda config: pytest.fail("Recriou com DEMO_MODE desligado"))
    assert reset_demo.main() == 1
    assert "DEMO_MODE" in capsys.readouterr().err


def test_precisa_recriar_depois_de_24_horas():
    agora = datetime(2026, 10, 29, 12, tzinfo=timezone.utc)
    assert demo.precisa_recriar(None, agora)
    assert not demo.precisa_recriar(agora - timedelta(hours=23, minutes=59), agora)
    assert demo.precisa_recriar(agora - timedelta(hours=24), agora)


def test_api_confere_a_recriacao_ao_iniciar_so_no_modo_demo(monkeypatch):
    chamadas = []
    monkeypatch.setattr(demo, "recriar_se_preciso", lambda config: chamadas.append(config))
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    with TestClient(app):
        pass
    assert chamadas == []

    monkeypatch.setattr(demo, "ler_config_demo", lambda config: "config-do-demo")
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    with TestClient(app):
        pass
    assert chamadas == ["config-do-demo"]


def test_api_nao_sobe_no_modo_demo_com_configuracao_errada(monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    monkeypatch.setattr(settings, "MIGRATIONS_DATABASE_URL_DEFINIDA", False)
    monkeypatch.setattr(demo, "recriar_se_preciso", lambda config: pytest.fail("Recriou sem configuração"))
    with pytest.raises(demo.DemoRecusadaError):
        with TestClient(app):
            pass


# --- RN-54 e RN-55: recriação no banco ---


def test_ct69_recriacao_deixa_so_as_duas_contas_e_os_dados_de_exemplo(engine, recriacao):
    with Session(engine) as db:
        criar_fornecedor(db, nome="Fornecedor antigo")
        criar_usuario(db, nome="Revisor", email="revisor-ui@estoque.local", senha=SENHA_DONO, perfil="admin")

    demo.recriar(recriacao)

    with Session(engine) as db:
        usuarios = db.scalars(select(User).order_by(User.id)).all()
        assert [(u.email, u.perfil, u.demo) for u in usuarios] == [
            ("dono@exemplo.com.br", "admin", False),
            ("demo@exemplo.com.br", "operador", True),
        ]
        assert autenticar(db, "dono@exemplo.com.br", SENHA_DONO) is not None
        assert autenticar(db, "demo@exemplo.com.br", SENHA_DEMO) is not None

        assert db.scalar(select(func.count()).select_from(Supplier).where(Supplier.nome == "Fornecedor antigo")) == 0
        assert db.scalar(select(func.count()).select_from(Product)) == len(demo._PRODUTOS)
        assert db.scalar(select(func.count()).select_from(StockMovement)) > len(demo._ENTRADAS)
        tipos = set(db.scalars(select(Alert.tipo).where(Alert.resolvido_em.is_(None))))
        assert tipos == {"estoque_baixo", "vencimento_proximo"}
        assert db.scalar(select(func.count()).select_from(DemoReset)) == 1

        # RN-10: a saída de 12 litros de leite saiu do lote que vence antes (30 - 12 = 18)
        leite = db.scalars(
            select(Batch.quantidade)
            .join(Product, Product.id == Batch.produto_id)
            .where(Product.codigo_barras == "7896000000011")
            .order_by(Batch.validade)
        ).all()
        assert leite == [18, 40]


def test_ao_iniciar_com_um_usuario_so_recria_sem_o_revisor_ui(engine, recriacao):
    """Render: sem APP_DB_ROLE, a migration de permissões não faz nada e a recriação ao iniciar
    funciona com o dono. Só as duas contas existem; o revisor-ui@estoque.local, nunca (RN-55)."""
    # Primeira subida no Render: banco vazio, nenhuma recriação ainda
    migracoes.apagar_estrutura(engine)

    assert demo.recriar_se_preciso(replace(recriacao, app_db_role="")) is True

    with Session(engine) as db:
        emails = db.scalars(select(User.email).order_by(User.id)).all()
    assert emails == ["dono@exemplo.com.br", "demo@exemplo.com.br"]


def test_ct71_ao_iniciar_so_recria_depois_de_24_horas(engine, recriacao):
    visitante = select(func.count()).select_from(Supplier).where(Supplier.nome == "Cadastrado pelo visitante")
    # Nenhuma recriação ainda (nem a tabela existe): recria
    migracoes.apagar_estrutura(engine)
    assert demo.recriar_se_preciso(recriacao) is True

    with Session(engine) as db:
        criar_fornecedor(db, nome="Cadastrado pelo visitante")

    agora = datetime.now(timezone.utc)
    assert demo.recriar_se_preciso(recriacao, agora + timedelta(hours=23)) is False
    assert _contar(engine, visitante) == 1

    assert demo.recriar_se_preciso(recriacao, agora + timedelta(hours=25)) is True
    assert _contar(engine, visitante) == 0
    assert _contar(engine, select(func.count()).select_from(DemoReset)) == 1


def test_ct72_token_de_antes_da_recriacao_deixa_de_valer(engine, recriacao):
    demo.recriar(recriacao)
    with _cliente(engine) as cliente:
        resposta = cliente.post("/auth/login", data={"username": "demo@exemplo.com.br", "password": SENHA_DEMO})
        token = resposta.json()["access_token"]
        me = cliente.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200 and me.json()["demo"] is True

    demo.recriar(recriacao)
    with _cliente(engine) as cliente:
        # A conta nova tem o mesmo id, mas o token é de antes da recriação
        assert cliente.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


# --- RN-56 e RN-57 ---


def test_ct75_conta_demo_tem_limite_de_alteracoes_por_minuto(client, db, operador, token_operador):
    cabecalho_demo = {"Authorization": f"Bearer {create_access_token(_conta_demo(db).id)}"}
    for numero in range(30):
        resposta = client.post("/suppliers", json={"nome": f"Fornecedor {numero}"}, headers=cabecalho_demo)
        assert resposta.status_code == 201
    resposta = client.post("/suppliers", json={"nome": "Fornecedor 31"}, headers=cabecalho_demo)
    assert resposta.status_code == 429
    assert resposta.json()["detail"] == limiter_do_demo.MENSAGEM_LIMITE_DEMO
    assert _contar_na_sessao(db, Supplier, Supplier.nome == "Fornecedor 31") == 0
    # O limite vale para todas as alterações da conta de demonstração, não só para a rota usada
    assert client.post("/alerts/generate", headers=cabecalho_demo).status_code == 429
    # Leitura continua liberada
    assert client.get("/suppliers", headers=cabecalho_demo).status_code == 200

    # A conta comum, no mesmo ritmo, não é limitada
    cabecalho = {"Authorization": f"Bearer {token_operador}"}
    for numero in range(31):
        assert client.post("/suppliers", json={"nome": f"Comum {numero}"}, headers=cabecalho).status_code == 201


def test_ct76_teto_de_cadastros_no_modo_demo(client, db, token_operador, monkeypatch):
    from app.services import teto_demo

    cabecalho = {"Authorization": f"Bearer {token_operador}"}
    monkeypatch.setattr(teto_demo, "TETO_DEMO", 2)
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    for numero in range(2):
        assert client.post("/suppliers", json={"nome": f"F{numero}"}, headers=cabecalho).status_code == 201
        produto = {"nome": f"P{numero}", "codigo_barras": f"78900000{numero}", "estoque_minimo": 1}
        assert client.post("/products", json=produto, headers=cabecalho).status_code == 201

    resposta = client.post("/suppliers", json={"nome": "Terceiro"}, headers=cabecalho)
    assert resposta.status_code == 409
    assert "limite de 2 fornecedores" in resposta.json()["detail"]
    produto = {"nome": "Terceiro", "codigo_barras": "789000009", "estoque_minimo": 1}
    resposta = client.post("/products", json=produto, headers=cabecalho)
    assert resposta.status_code == 409
    assert "limite de 2 produtos" in resposta.json()["detail"]
    assert _contar_na_sessao(db, Product, Product.nome == "Terceiro") == 0

    # Editar continua permitido
    fornecedor_id = client.get("/suppliers", headers=cabecalho).json()["itens"][0]["id"]
    assert client.patch(f"/suppliers/{fornecedor_id}", json={"nome": "Editado"}, headers=cabecalho).status_code == 200

    # Fora do modo de demonstração não há teto
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    assert client.post("/suppliers", json={"nome": "Terceiro"}, headers=cabecalho).status_code == 201


def _contar_na_sessao(db, modelo, condicao) -> int:
    return db.scalar(select(func.count()).select_from(modelo).where(condicao))
