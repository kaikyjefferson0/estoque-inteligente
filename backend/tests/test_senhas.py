from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import ler_booleano, settings
from app.core.limiter import MENSAGEM_LIMITE
from app.core.security import ALGORITHM, create_access_token, verify_password

from tests.conftest import SENHA_ADMIN, SENHA_OPERADOR

SENHA_NOVA = "senha-nova-segura-456"


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def login(client, email: str, senha: str, headers: dict[str, str] | None = None):
    return client.post("/auth/login", data={"username": email, "password": senha}, headers=headers)


def trocar(client, token: str, senha_atual: str, senha_nova: str):
    return client.post(
        "/auth/change-password",
        headers=auth(token),
        json={"senha_atual": senha_atual, "senha_nova": senha_nova},
    )


# --- Casos de teste do docs\casos-de-teste.md (Senhas e tentativas) ---


def test_ct54_11a_tentativa_de_login_no_minuto_devolve_429(client, admin):
    """CT-54 / RN-47: 10 tentativas passam pelo login; a 11ª no mesmo minuto recebe 429."""
    for _ in range(10):
        assert login(client, admin.email, "senha-errada-123").status_code == 401

    resposta = login(client, admin.email, SENHA_ADMIN)  # mesmo com a senha certa
    assert resposta.status_code == 429
    assert resposta.json() == {"detail": MENSAGEM_LIMITE}
    assert "access_token" not in resposta.json()


def test_ct55_trocar_senha_com_senha_atual_errada_e_recusado(client, db, operador, token_operador):
    """CT-55 / RN-48: senha atual errada recusa a troca e a senha continua a mesma."""
    resposta = trocar(client, token_operador, "senha-errada-123", SENHA_NOVA)
    assert resposta.status_code == 422
    assert resposta.json()["detail"][0]["loc"] == ["body", "senha_atual"]

    db.refresh(operador)
    assert verify_password(SENHA_OPERADOR, operador.senha_hash)
    assert operador.senha_alterada_em is None
    # A recusa não derruba a sessão
    assert client.get("/auth/me", headers=auth(token_operador)).status_code == 200


def test_ct56_trocar_senha_invalida_token_antigo_e_senha_nova_entra(client, operador, token_operador):
    """CT-56 / RN-48: depois da troca o token antigo não vale e a senha nova entra."""
    assert trocar(client, token_operador, SENHA_OPERADOR, SENHA_NOVA).status_code == 204

    assert client.get("/auth/me", headers=auth(token_operador)).status_code == 401
    assert login(client, operador.email, SENHA_OPERADOR).status_code == 401

    resposta = login(client, operador.email, SENHA_NOVA)
    assert resposta.status_code == 200
    novo_token = resposta.json()["access_token"]
    assert client.get("/auth/me", headers=auth(novo_token)).json()["id"] == operador.id


def test_ct57_admin_define_nova_senha_do_operador(client, operador, token_admin, token_operador):
    """CT-57 / RN-49: o operador entra com a nova senha e o token antigo dele não vale."""
    resposta = client.post(f"/users/{operador.id}/password", headers=auth(token_admin), json={"senha_nova": SENHA_NOVA})
    assert resposta.status_code == 204

    assert client.get("/auth/me", headers=auth(token_operador)).status_code == 401
    assert login(client, operador.email, SENHA_OPERADOR).status_code == 401
    novo = login(client, operador.email, SENHA_NOVA)
    assert novo.status_code == 200
    assert client.get("/auth/me", headers=auth(novo.json()["access_token"])).status_code == 200

    # O token do admin continua valendo
    assert client.get("/auth/me", headers=auth(token_admin)).status_code == 200


def test_ct58_admin_nao_define_a_propria_senha_pela_rota_de_admin(client, db, admin, token_admin):
    """CT-58 / RN-49: a própria senha só muda pela troca com a senha atual (RN-48)."""
    resposta = client.post(f"/users/{admin.id}/password", headers=auth(token_admin), json={"senha_nova": SENHA_NOVA})
    assert resposta.status_code == 409
    assert "Minha conta" in resposta.json()["detail"]

    db.refresh(admin)
    assert verify_password(SENHA_ADMIN, admin.senha_hash)
    assert client.get("/auth/me", headers=auth(token_admin)).status_code == 200


def test_ct59_operador_nao_define_senha_de_outro_usuario(client, db, admin, operador, token_operador):
    """CT-59 / RN-02 e RN-49: operador bloqueado (403), inclusive para o próprio id."""
    for alvo in (admin, operador):
        resposta = client.post(f"/users/{alvo.id}/password", headers=auth(token_operador), json={"senha_nova": SENHA_NOVA})
        assert resposta.status_code == 403

    db.refresh(admin)
    assert verify_password(SENHA_ADMIN, admin.senha_hash)
    assert admin.senha_alterada_em is None


# --- Testes extras (RN-47, RN-48, RN-49) ---


def test_limite_ignora_x_forwarded_for_quando_desligado(client, admin, monkeypatch):
    """Sem proxy confiável, trocar o X-Forwarded-For não dá tentativas novas."""
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", False)
    for i in range(10):
        assert login(client, admin.email, "errada-123", {"X-Forwarded-For": f"10.0.0.{i}"}).status_code == 401
    assert login(client, admin.email, "errada-123", {"X-Forwarded-For": "10.0.0.99"}).status_code == 429


def test_limite_usa_ip_do_proxy_quando_ligado(client, admin, monkeypatch):
    """Atrás do proxy, conta pelo IP que o proxy acrescentou (o último); o primeiro, inventável, não muda nada."""
    monkeypatch.setattr(settings, "TRUST_PROXY_HEADERS", True)
    for i in range(10):
        cabecalho = {"X-Forwarded-For": f"1.2.3.{i}, 200.1.1.1"}
        assert login(client, admin.email, "errada-123", cabecalho).status_code == 401
    assert login(client, admin.email, "errada-123", {"X-Forwarded-For": "9.9.9.9, 200.1.1.1"}).status_code == 429

    # Outro IP real tem a própria contagem
    assert login(client, admin.email, SENHA_ADMIN, {"X-Forwarded-For": "200.2.2.2"}).status_code == 200


def test_limite_vale_so_para_o_login(client, token_admin):
    for _ in range(15):
        assert client.get("/auth/me", headers=auth(token_admin)).status_code == 200


def test_trocar_senha_nova_igual_ou_curta_e_recusada(client, token_operador):
    """RN-48: a nova tem no mínimo 8 caracteres e é diferente da atual."""
    igual = trocar(client, token_operador, SENHA_OPERADOR, SENHA_OPERADOR)
    assert igual.status_code == 422
    assert igual.json()["detail"][0]["loc"] == ["body", "senha_nova"]

    assert trocar(client, token_operador, SENHA_OPERADOR, "1234567").status_code == 422
    assert client.get("/auth/me", headers=auth(token_operador)).status_code == 200


def test_trocar_senha_sem_login_devolve_401(client):
    resposta = client.post("/auth/change-password", json={"senha_atual": "x", "senha_nova": SENHA_NOVA})
    assert resposta.status_code == 401


def test_admin_define_senha_curta_ou_de_usuario_inexistente(client, operador, token_admin):
    headers = auth(token_admin)
    assert client.post(f"/users/{operador.id}/password", headers=headers, json={"senha_nova": "curta"}).status_code == 422
    assert client.post("/users/999999/password", headers=headers, json={"senha_nova": SENHA_NOVA}).status_code == 404


def test_token_sem_iat_e_recusado(client, admin):
    """O token precisa informar a emissão para a regra da troca de senha funcionar."""
    expira = datetime.now(timezone.utc) + timedelta(minutes=5)
    token = jwt.encode({"sub": str(admin.id), "exp": expira}, settings.SECRET_KEY, algorithm=ALGORITHM)
    assert client.get("/auth/me", headers=auth(token)).status_code == 401


def test_token_emitido_logo_depois_da_troca_vale(client, operador, token_operador):
    """O iat com fração de segundo não confunde um token novo, do mesmo segundo, com um antigo."""
    assert trocar(client, token_operador, SENHA_OPERADOR, SENHA_NOVA).status_code == 204
    assert client.get("/auth/me", headers=auth(create_access_token(operador.id))).status_code == 200


def test_ler_booleano():
    for ligado in ("true", "TRUE", " 1 ", "sim", "yes", "on"):
        assert ler_booleano(ligado) is True
    for desligado in (None, "", "false", "0", "não", "talvez"):
        assert ler_booleano(desligado) is False
