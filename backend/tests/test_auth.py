from app.models.user import User
from app.services.users import buscar_por_email

from tests.conftest import SENHA_ADMIN, SENHA_OPERADOR

MENSAGEM_LOGIN_INVALIDO = "E-mail ou senha incorretos"


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def login(client, email: str, senha: str):
    # Formulário OAuth2: o campo username recebe o e-mail
    return client.post("/auth/login", data={"username": email, "password": senha})


def assert_sem_senha_hash(dados):
    itens = dados if isinstance(dados, list) else [dados]
    for item in itens:
        assert "senha_hash" not in item
        assert "senha" not in item


# --- Casos de teste do docs\casos-de-teste.md ---


def test_ct01_login_correto(client, admin, operador):
    """CT-01: entra e acessa com as permissões do próprio perfil."""
    for usuario, senha in ((admin, SENHA_ADMIN), (operador, SENHA_OPERADOR)):
        resposta = login(client, usuario.email, senha)
        assert resposta.status_code == 200
        corpo = resposta.json()
        assert corpo["token_type"] == "bearer"
        assert corpo["access_token"]

        me = client.get("/auth/me", headers=auth(corpo["access_token"]))
        assert me.status_code == 200
        assert me.json()["id"] == usuario.id
        assert me.json()["perfil"] == usuario.perfil  # perfil não trocado


def test_ct02_senha_errada_mensagem_generica(client, admin):
    """CT-02 / RN-03: senha errada e e-mail inexistente dão a mesma mensagem."""
    senha_errada = login(client, admin.email, "senha-errada-123")
    email_inexistente = login(client, "ninguem@teste.com", SENHA_ADMIN)

    for resposta in (senha_errada, email_inexistente):
        assert resposta.status_code == 401
        assert resposta.json() == {"detail": MENSAGEM_LOGIN_INVALIDO}
        assert "access_token" not in resposta.json()

    assert senha_errada.json() == email_inexistente.json()


def test_ct03_operador_bloqueado_em_users(client, token_operador, admin):
    """CT-03 / RN-02: operador não acessa nenhuma rota da área de usuários."""
    headers = auth(token_operador)
    tentativas = [
        client.get("/users", headers=headers),
        client.get(f"/users/{admin.id}", headers=headers),
        client.post(
            "/users",
            headers=headers,
            json={"nome": "X", "email": "x@teste.com", "senha": "12345678", "perfil": "admin"},
        ),
        client.patch(f"/users/{admin.id}", headers=headers, json={"ativo": False}),
    ]
    for resposta in tentativas:
        assert resposta.status_code == 403


# --- Testes extras (RN-18, RN-20, RN-21, RN-22) ---


def test_sem_token_devolve_401(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/users").status_code == 401


def test_token_invalido_devolve_401(client):
    headers = auth("isto-nao-e-um-jwt")
    assert client.get("/auth/me", headers=headers).status_code == 401
    assert client.get("/users", headers=headers).status_code == 401


def test_usuario_inativo_nao_entra(client, db, operador, token_operador):
    """RN-21: inativo não faz login e o token antigo deixa de valer."""
    operador.ativo = False
    db.commit()

    resposta = login(client, operador.email, SENHA_OPERADOR)
    assert resposta.status_code == 401
    assert resposta.json() == {"detail": MENSAGEM_LOGIN_INVALIDO}

    assert client.get("/auth/me", headers=auth(token_operador)).status_code == 401


def test_admin_cria_usuario(client, token_admin):
    """RN-20: o admin cria usuários; o novo usuário consegue entrar."""
    resposta = client.post(
        "/users",
        headers=auth(token_admin),
        json={"nome": "Novo", "email": "Novo@Teste.com", "senha": "senha-nova-123", "perfil": "operador"},
    )
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["email"] == "novo@teste.com"
    assert corpo["perfil"] == "operador"
    assert corpo["ativo"] is True

    assert login(client, "novo@teste.com", "senha-nova-123").status_code == 200


def test_email_duplicado_devolve_409(client, token_admin, operador):
    resposta = client.post(
        "/users",
        headers=auth(token_admin),
        json={"nome": "Outro", "email": operador.email.upper(), "senha": "senha-nova-123", "perfil": "operador"},
    )
    assert resposta.status_code == 409


def test_senha_hash_nunca_aparece_nas_respostas(client, token_admin, admin, operador):
    headers = auth(token_admin)
    criado = client.post(
        "/users",
        headers=headers,
        json={"nome": "Novo", "email": "novo@teste.com", "senha": "senha-nova-123", "perfil": "operador"},
    )
    respostas = [
        criado,
        client.get("/users", headers=headers),
        client.get(f"/users/{operador.id}", headers=headers),
        client.patch(f"/users/{operador.id}", headers=headers, json={"nome": "Operador 2"}),
        client.get("/auth/me", headers=headers),
    ]
    for resposta in respostas:
        assert resposta.status_code in (200, 201)
        assert_sem_senha_hash(resposta.json())
        assert "$argon2" not in resposta.text


def test_hash_no_banco_e_argon2(client, db, token_admin):
    senha = "senha-nova-123"
    resposta = client.post(
        "/users",
        headers=auth(token_admin),
        json={"nome": "Novo", "email": "novo@teste.com", "senha": senha, "perfil": "operador"},
    )
    assert resposta.status_code == 201

    usuario: User = buscar_por_email(db, "novo@teste.com")
    assert usuario.senha_hash.startswith("$argon2")
    assert usuario.senha_hash != senha


def test_admin_nao_desativa_a_si_mesmo(client, db, admin, token_admin):
    """RN-22."""
    resposta = client.patch(f"/users/{admin.id}", headers=auth(token_admin), json={"ativo": False})
    assert resposta.status_code == 409
    db.refresh(admin)
    assert admin.ativo is True


def test_admin_nao_muda_o_proprio_perfil(client, db, admin, token_admin):
    """RN-22."""
    resposta = client.patch(f"/users/{admin.id}", headers=auth(token_admin), json={"perfil": "operador"})
    assert resposta.status_code == 409
    db.refresh(admin)
    assert admin.perfil == "admin"
