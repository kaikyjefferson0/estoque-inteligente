import pytest
from fastapi.testclient import TestClient

from app.core.config import ler_ambiente, settings, validar_ambiente
from app.main import CABECALHOS_DE_SEGURANCA, HSTS, criar_app

DOCUMENTACAO = ("/docs", "/redoc", "/openapi.json")


def cliente(monkeypatch, ambiente: str) -> TestClient:
    monkeypatch.setattr(settings, "APP_ENV", ambiente)
    return TestClient(criar_app())


def assert_cabecalhos(response) -> None:
    for nome, valor in CABECALHOS_DE_SEGURANCA.items():
        assert response.headers[nome] == valor


def test_cabecalhos_de_seguranca_em_todas_as_respostas(monkeypatch):
    client = cliente(monkeypatch, "development")
    origem = settings.CORS_ORIGINS[0]
    respostas = [
        client.get("/health"),
        client.get("/auth/me"),  # 401
        client.get("/rota-que-nao-existe"),  # 404
        client.post("/auth/login", data={}),  # 422
        client.options(
            "/auth/me",
            headers={"Origin": origem, "Access-Control-Request-Method": "GET"},
        ),  # preflight do CORS
    ]
    assert [r.status_code for r in respostas] == [200, 401, 404, 422, 200]
    for response in respostas:
        assert_cabecalhos(response)


def test_hsts_so_em_producao(monkeypatch):
    assert "strict-transport-security" not in cliente(monkeypatch, "development").get("/health").headers

    response = cliente(monkeypatch, "production").get("/health")
    assert response.headers["strict-transport-security"] == HSTS
    assert_cabecalhos(response)


def test_documentacao_aberta_em_desenvolvimento(monkeypatch):
    client = cliente(monkeypatch, "development")
    for caminho in DOCUMENTACAO:
        assert client.get(caminho).status_code == 200


def test_documentacao_desligada_em_producao(monkeypatch):
    client = cliente(monkeypatch, "production")
    for caminho in DOCUMENTACAO:
        assert client.get(caminho).status_code == 404
    assert client.get("/health").status_code == 200


def test_app_env_padrao_e_development():
    assert ler_ambiente(None) == "development"
    assert ler_ambiente("  ") == "development"
    assert ler_ambiente(" Production ") == "production"


def test_app_env_desconhecido_derruba_a_api():
    with pytest.raises(RuntimeError, match="development ou production"):
        ler_ambiente("prod")


def test_no_render_sem_production_derruba_a_api():
    """Esquecer o APP_ENV no Render não pode subir a API com /docs aberto."""
    with pytest.raises(RuntimeError, match="APP_ENV=production"):
        validar_ambiente("development", no_render=True, confia_no_proxy=True)


def test_production_sem_proxy_confiavel_derruba_a_api():
    with pytest.raises(RuntimeError, match="TRUST_PROXY_HEADERS=true"):
        validar_ambiente("production", no_render=True, confia_no_proxy=False)


def test_ambientes_validos_sobem():
    validar_ambiente("development", no_render=False, confia_no_proxy=False)
    validar_ambiente("production", no_render=True, confia_no_proxy=True)
