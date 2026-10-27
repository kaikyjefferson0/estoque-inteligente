import pytest

from app.core.config import SECRET_KEY_EXEMPLO, validar_secret_key


def test_secret_key_curta_e_recusada():
    with pytest.raises(RuntimeError, match="pelo menos 32"):
        validar_secret_key("a" * 31)


def test_secret_key_de_exemplo_e_recusada():
    with pytest.raises(RuntimeError, match="valor de exemplo"):
        validar_secret_key(SECRET_KEY_EXEMPLO)


def test_secret_key_valida_passa():
    validar_secret_key("a" * 32)
