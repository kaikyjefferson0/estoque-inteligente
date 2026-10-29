import pytest

from app.core.config import SECRET_KEY_EXEMPLO, normalizar_url_banco, validar_secret_key


def test_secret_key_curta_e_recusada():
    with pytest.raises(RuntimeError, match="pelo menos 32"):
        validar_secret_key("a" * 31)


def test_secret_key_de_exemplo_e_recusada():
    with pytest.raises(RuntimeError, match="valor de exemplo"):
        validar_secret_key(SECRET_KEY_EXEMPLO)


def test_secret_key_valida_passa():
    validar_secret_key("a" * 32)


@pytest.mark.parametrize(
    "url",
    [
        "postgresql://estoque:senha@dpg-abc-a/estoque_inteligente",
        "postgres://estoque:senha@dpg-abc-a/estoque_inteligente",
        "  postgresql://estoque:senha@dpg-abc-a/estoque_inteligente  ",
    ],
)
def test_url_do_render_passa_a_usar_o_psycopg_3(url):
    assert normalizar_url_banco(url) == "postgresql+psycopg://estoque:senha@dpg-abc-a/estoque_inteligente"


def test_url_que_ja_tem_driver_ou_vazia_fica_igual():
    url = "postgresql+psycopg://estoque:senha@localhost:5432/estoque_inteligente"
    assert normalizar_url_banco(url) == url
    assert normalizar_url_banco("") == ""
