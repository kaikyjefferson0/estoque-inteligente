import psycopg
import pytest
from sqlalchemy.pool import Pool


@pytest.fixture(autouse=True)
def sem_banco(monkeypatch):
    """Teste unitário não fala com o banco: qualquer tentativa de conexão falha na hora,
    mesmo com o banco ligado, em vez de o teste virar de integração sem ninguém notar."""

    def recusar(*_args, **_kwargs):
        raise AssertionError("Teste unitário tentou conectar no banco.")

    monkeypatch.setattr(Pool, "connect", recusar)
    monkeypatch.setattr(psycopg, "connect", recusar)
    monkeypatch.setattr(psycopg.Connection, "connect", recusar)
