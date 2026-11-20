import pytest
from sqlalchemy.exc import IntegrityError

from app.models.user import User
from app.services.auth import autenticar
from app.services.users import atualizar_usuario, criar_usuario, listar_usuarios, obter_usuario

pytestmark = pytest.mark.integracao


def test_cadastro_consulta_edicao_e_desativacao_de_usuario(db, admin):
    email = "novo.operador@teste.com"
    senha = "senha-ficticia-do-operador"
    criado = criar_usuario(db, nome="Novo operador", email=email, senha=senha, perfil="operador")
    usuario_id = criado.id

    db.expunge_all()
    consultado = obter_usuario(db, usuario_id)
    assert consultado.nome == "Novo operador"
    assert consultado.email == email
    assert consultado.ativo is True
    assert usuario_id in {usuario.id for usuario in listar_usuarios(db, limite=10, deslocamento=0)["itens"]}
    assert autenticar(db, email, senha) is not None

    atualizar_usuario(db, admin, usuario_id, {"nome": "Operador atualizado"})
    db.expunge_all()
    assert obter_usuario(db, usuario_id).nome == "Operador atualizado"

    atualizar_usuario(db, admin, usuario_id, {"ativo": False})
    db.expunge_all()
    assert obter_usuario(db, usuario_id).ativo is False
    assert autenticar(db, email, senha) is None


def test_postgres_recusa_email_duplicado(db, operador):
    duplicado = User(nome="Duplicado", email=operador.email, senha_hash=operador.senha_hash, perfil="operador")

    with pytest.raises(IntegrityError) as erro, db.begin_nested():
        db.add(duplicado)
        db.flush()

    assert erro.value.orig.diag.constraint_name == "ix_users_email"


def test_contrato_http_do_crud_de_usuarios(client, token_admin):
    headers = {"Authorization": f"Bearer {token_admin}"}
    dados = {
        "nome": "Operador do contrato",
        "email": "contrato@teste.com",
        "senha": "senha-ficticia-do-operador",
        "perfil": "operador",
    }
    criado = client.post("/users", json=dados, headers=headers)
    assert criado.status_code == 201
    caminho = f"/users/{criado.json()['id']}"
    consultado = client.get(caminho, headers=headers)
    assert consultado.status_code == 200
    assert consultado.json()["email"] == dados["email"]
    assert client.get("/users/2147483647", headers=headers).status_code == 404
    assert client.post("/users", json=dados, headers=headers).status_code == 409
    assert client.post("/users", json={**dados, "email": "inválido"}, headers=headers).status_code == 422

    editado = client.patch(caminho, json={"nome": "Nome atualizado"}, headers=headers)
    assert editado.status_code == 200
    assert editado.json()["nome"] == "Nome atualizado"

    desativado = client.patch(caminho, json={"ativo": False}, headers=headers)
    assert desativado.status_code == 200
    assert client.get(caminho, headers=headers).json()["ativo"] is False
