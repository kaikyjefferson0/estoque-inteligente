"""Cria o primeiro admin (RN-20). Uso, dentro de backend: py -m app.scripts.create_admin"""

import sys
from getpass import getpass

from app.core.database import SessionLocal
from app.services.users import EmailJaCadastradoError, buscar_por_email, criar_usuario

SENHA_MINIMA = 8


def main() -> int:
    nome = input("Nome: ").strip()
    email = input("E-mail: ").strip()
    if not nome or not email:
        print("Nome e e-mail são obrigatórios.")
        return 1

    senha = getpass("Senha (mínimo 8 caracteres): ")
    if len(senha) < SENHA_MINIMA:
        print(f"A senha precisa ter pelo menos {SENHA_MINIMA} caracteres.")
        return 1
    if getpass("Confirme a senha: ") != senha:
        print("As senhas não conferem.")
        return 1

    with SessionLocal() as db:
        if buscar_por_email(db, email) is not None:
            print("Já existe um usuário com esse e-mail.")
            return 1
        try:
            usuario = criar_usuario(db, nome=nome, email=email, senha=senha, perfil="admin")
        except EmailJaCadastradoError:
            print("Já existe um usuário com esse e-mail.")
            return 1

    print(f"Admin criado: {usuario.nome} <{usuario.email}> (id {usuario.id})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
