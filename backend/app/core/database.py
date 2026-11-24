from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# Banco que não responde vira erro em segundos, em vez de a requisição ficar pendurada
# até o proxy do Render desistir (partida a frio no plano gratuito)
TEMPO_LIMITE_CONEXAO_SEGUNDOS = 10


def criar_engine(url: str, **opcoes) -> Engine:
    """Toda conexão da API e dos scripts passa por aqui (as das migrations são do alembic/env.py).

    RN-66: hide_parameters deixa os valores enviados (nome, e-mail, hash de senha...) fora do texto do
    erro de SQL e, por isso, fora do log.
    """
    return create_engine(
        url,
        connect_args={"connect_timeout": TEMPO_LIMITE_CONEXAO_SEGUNDOS},
        hide_parameters=True,
        **opcoes,
    )


engine = criar_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
