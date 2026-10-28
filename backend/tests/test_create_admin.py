from app.schemas.users import SENHA_MAXIMA
from app.scripts import create_admin


def test_create_admin_recusa_senha_acima_do_maximo(monkeypatch, capsys):
    """Senha maior que o login aceita criaria um admin que nunca entra; o script recusa antes do banco."""
    respostas = iter(["Admin", "admin@empresa.com.br"])
    monkeypatch.setattr("builtins.input", lambda _: next(respostas))
    monkeypatch.setattr(create_admin, "getpass", lambda _: "a" * (SENHA_MAXIMA + 1))

    def banco_nao_pode_ser_usado():
        raise AssertionError("o script abriu o banco")

    monkeypatch.setattr(create_admin, "SessionLocal", banco_nao_pode_ser_usado)

    assert create_admin.main() == 1
    assert f"no máximo {SENHA_MAXIMA} caracteres" in capsys.readouterr().out
