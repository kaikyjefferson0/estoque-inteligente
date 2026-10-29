"""Tolerância à partida a frio no Render: tempo limite de conexão com o banco e tempo limite
da trava da recriação da demonstração.

Os testes da trava usam o banco de teste de verdade, sem a transação desfeita do conftest
(como os de test_demo.py); a fixture `recriacao` devolve o banco limpo no fim.
"""

import time
from collections.abc import Generator

import pytest
from sqlalchemy import event, func, select, text
from sqlalchemy.orm import Session

from app.core import database
from app.models.user import User
from app.scripts import reset_demo
from app.services import demo
from tests.conftest import recriar_banco
from tests.test_demo import _config, _settings


class _Parou(Exception):
    """Interrompe a conexão antes de ir ao banco: só os parâmetros interessam."""


def _parametros_de_conexao(engine) -> dict:
    capturados: dict = {}

    def capturar(dialect, registro, cargs, cparams):
        capturados.update(cparams)
        raise _Parou

    event.listen(engine, "do_connect", capturar)
    try:
        # Sem conexões guardadas no pool, a próxima passa pelo do_connect
        engine.dispose()
        with pytest.raises(_Parou):
            engine.connect()
    finally:
        event.remove(engine, "do_connect", capturar)
    return capturados


@pytest.fixture
def recriacao(engine) -> Generator[demo.ConfigDemo, None, None]:
    try:
        yield _config(engine)
    finally:
        recriar_banco(engine)


# --- connect_timeout ---


def test_conexao_da_api_tem_tempo_limite():
    parametros = _parametros_de_conexao(database.engine)
    assert parametros["connect_timeout"] == database.TEMPO_LIMITE_CONEXAO_SEGUNDOS == 10


def test_conexao_da_recriacao_da_demo_tem_tempo_limite(monkeypatch):
    parametros: list[dict] = []
    criar_original = database.criar_engine

    def criar_e_parar(url, **opcoes):
        engine = criar_original(url, **opcoes)

        @event.listens_for(engine, "do_connect")
        def capturar(dialect, registro, cargs, cparams):
            parametros.append(dict(cparams))
            raise _Parou

        return engine

    monkeypatch.setattr(demo, "criar_engine", criar_e_parar)
    # A recriação para na primeira conexão, antes de chegar a qualquer banco
    with pytest.raises(_Parou):
        demo.recriar_se_preciso(demo.ler_config_demo(_settings()))
    assert parametros[0]["connect_timeout"] == database.TEMPO_LIMITE_CONEXAO_SEGUNDOS


# --- tempo limite da trava ---


def test_trava_ocupada_desiste_no_tempo_limite_sem_apagar_nada(engine, recriacao, monkeypatch):
    monkeypatch.setattr(demo, "TEMPO_LIMITE_DA_TRAVA_SEGUNDOS", 1)
    usuarios = select(func.count()).select_from(User)
    with Session(engine) as db:
        antes = db.scalar(usuarios)

    # Outra "recriação" segura a trava numa conexão própria
    with engine.connect() as outra:
        outra.execute(text("SELECT pg_advisory_lock(:chave)"), {"chave": demo._CHAVE_DA_TRAVA})
        outra.commit()
        try:
            inicio = time.monotonic()
            with pytest.raises(demo.DemoOcupadaError) as erro:
                demo.recriar_se_preciso(recriacao)
            assert time.monotonic() - inicio < 10
        finally:
            outra.execute(text("SELECT pg_advisory_unlock(:chave)"), {"chave": demo._CHAVE_DA_TRAVA})
            outra.commit()

    assert "1 segundos" in str(erro.value)
    assert recriacao.admin_senha not in str(erro.value)
    with Session(engine) as db:
        assert db.scalar(usuarios) == antes


def test_trava_livre_continua_funcionando_com_o_tempo_limite(engine, recriacao):
    engine_dono = database.criar_engine(recriacao.url_dono)
    try:
        with demo._travado(engine_dono) as conexao:
            # Depois de pegar a trava, o lock_timeout local já acabou junto com a transação
            assert conexao.scalar(text("SHOW lock_timeout")) == "0"
    finally:
        engine_dono.dispose()


def test_comando_manual_com_trava_ocupada_mostra_a_mensagem(monkeypatch, capsys):
    monkeypatch.setattr(reset_demo, "settings", _settings())

    def ocupada(config):
        raise demo.DemoOcupadaError("Outra recriação da demonstração segurou a trava.")

    monkeypatch.setattr(demo, "recriar", ocupada)
    assert reset_demo.main() == 1
    assert "segurou a trava" in capsys.readouterr().err
