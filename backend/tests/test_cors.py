from fastapi.testclient import TestClient

from app.core.config import CORS_ORIGINS_PADRAO, ler_cors_origins, settings
from app.main import app

client = TestClient(app)


def test_cors_sem_variavel_usa_padrao_do_vite():
    assert ler_cors_origins(None) == [CORS_ORIGINS_PADRAO]
    assert ler_cors_origins("  ") == [CORS_ORIGINS_PADRAO]


def test_cors_lista_separada_por_virgula():
    assert ler_cors_origins(" https://a.com , https://b.com/ ,, ") == ["https://a.com", "https://b.com"]


def test_cors_endereco_sem_esquema_ganha_https():
    """Endereço do site vindo do Render sem o esquema (ex.: só o host)."""
    assert ler_cors_origins("estoque-site.onrender.com/, http://localhost:5173") == [
        "https://estoque-site.onrender.com",
        "http://localhost:5173",
    ]


def test_cors_preflight_de_origem_permitida():
    origem = settings.CORS_ORIGINS[0]
    response = client.options(
        "/auth/me",
        headers={
            "Origin": origem,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origem


def test_cors_origem_nao_permitida_nao_recebe_cabecalho():
    response = client.get("/health", headers={"Origin": "https://site-estranho.example"})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
