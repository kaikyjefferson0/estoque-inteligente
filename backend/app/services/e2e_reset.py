"""RN-67: reset do banco do teste de ponta a ponta (Cypress), chamado antes de cada teste.

Apaga todos os dados, então só funciona com a flag E2E_RESET, num banco _e2e e fora de produção.
A rota nem é registrada sem essas condições (app.main), e elas são conferidas de novo aqui.
"""

from dataclasses import dataclass
from datetime import datetime, timezone

from psycopg.errors import DeadlockDetected, LockNotAvailable
from sqlalchemy import text
from sqlalchemy.engine import Connection, make_url
from sqlalchemy.exc import ArgumentError, OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

import app.models  # noqa: F401  (registra as tabelas no Base.metadata)
from app.core.database import Base, criar_engine
from app.core.limiter import contagem_demo, limiter
from app.models.demo_reset import DemoReset
from app.schemas.users import SENHA_MAXIMA, SENHA_MINIMA
from app.services.products import criar_produto
from app.services.suppliers import criar_fornecedor
from app.services.users import criar_usuario

SUFIXO = "_e2e"
# Quanto o TRUNCATE espera por uma requisição em andamento antes de desistir
LIMITE_DA_TRAVA = "5s"

# As mesmas contas do tests\e2e_preparar.py
EMAIL_ADMIN = "admin.e2e@exemplo.com.br"
EMAIL_OPERADOR = "operador.e2e@exemplo.com.br"


class ResetRecusadoError(RuntimeError):
    """Uma das condições da RN-67 falhou; nada foi apagado. A mensagem nunca traz URL nem senha."""


class ResetOcupadoError(Exception):
    """Outra transação segurou as tabelas além do limite; nada foi apagado."""


@dataclass(frozen=True)
class Senhas:
    admin: str
    operador: str

    def __repr__(self) -> str:
        return "Senhas(***)"


def _alvo(url: str) -> tuple | None:
    """(host, porta, banco) da URL, ou None se não for um banco _e2e."""
    try:
        partes = make_url(url)
    except (ArgumentError, ValueError):  # ValueError: porta que não é número
        return None
    # Um dbname ou host na query (?dbname=outro) poderia valer mais que o do endereço
    if partes.query or not (partes.database or "").endswith(SUFIXO):
        return None
    return partes.host, partes.port, partes.database


def permitido(config) -> bool:
    """As condições da RN-67. `config` é o settings. A URL da API e a do dono precisam ser do mesmo banco _e2e."""
    if not config.E2E_RESET or config.em_producao or not config.MIGRATIONS_DATABASE_URL_DEFINIDA:
        return False
    alvo = _alvo(config.DATABASE_URL)
    return alvo is not None and alvo == _alvo(config.MIGRATIONS_DATABASE_URL)


def ler_senhas(config) -> Senhas:
    """As senhas das contas chegam só por variável de ambiente, geradas na hora por quem roda o teste."""
    for nome in ("E2E_SENHA_ADMIN", "E2E_SENHA_OPERADOR"):
        if not SENHA_MINIMA <= len(getattr(config, nome)) <= SENHA_MAXIMA:
            raise ResetRecusadoError(f"Com E2E_RESET=true, defina {nome} com {SENHA_MINIMA} a {SENHA_MAXIMA} caracteres.")
    return Senhas(admin=config.E2E_SENHA_ADMIN, operador=config.E2E_SENHA_OPERADOR)


def conferir_banco(conexao: Connection) -> None:
    """Última trava: o nome vem do próprio banco conectado, não da URL."""
    nome = conexao.scalar(text("SELECT current_database()"))
    if not nome.endswith(SUFIXO):
        raise ResetRecusadoError(f"Recusando apagar o banco '{nome}': o nome não termina em {SUFIXO}.")


def recriar_dados(conexao: Connection, senhas: Senhas) -> None:
    """Apaga e recria tudo na transação da conexão: ou fica o seed inteiro, ou nada muda."""
    conexao.execute(text("SELECT set_config('lock_timeout', :limite, true)"), {"limite": LIMITE_DA_TRAVA})
    tabelas = ", ".join(t.name for t in Base.metadata.sorted_tables if t.name != DemoReset.__tablename__)
    # RN-12: o trigger do histórico recusa UPDATE e DELETE, mas não dispara no TRUNCATE (que só o dono pode fazer)
    conexao.execute(text(f"TRUNCATE {tabelas} RESTART IDENTITY CASCADE"))
    with Session(bind=conexao, join_transaction_mode="create_savepoint", expire_on_commit=False) as db:
        _criar_contas(db, senhas)
        _criar_seed(db)


def _criar_contas(db: Session, senhas: Senhas) -> None:
    contas = [
        criar_usuario(db, nome="Admin E2E", email=EMAIL_ADMIN, senha=senhas.admin, perfil="admin"),
        criar_usuario(db, nome="Operador E2E", email=EMAIL_OPERADOR, senha=senhas.operador, perfil="operador"),
    ]
    # Os ids recomeçam do 1: sem isto, um token do teste anterior continuaria valendo (RN-48)
    agora = datetime.now(timezone.utc)
    for conta in contas:
        conta.senha_alterada_em = agora
    db.commit()


def _criar_seed(db: Session) -> None:
    """O estado conhecido de todo teste (os mesmos valores estão em frontend\\cypress\\support\\seed.ts)."""
    com_produto = criar_fornecedor(db, nome="Distribuidora Central", cnpj="11222333000181")
    criar_fornecedor(db, nome="Atacado Boa Vista", cnpj="45987321000110")
    criar_produto(
        db,
        nome="Refrigerante cola 2 L",
        codigo_barras="7896000000080",
        estoque_minimo=10,
        fornecedor_id=com_produto.id,
    )


def resetar(config) -> None:
    """RN-67: banco de volta ao seed e contagens de tentativas zeradas (RN-47)."""
    if not permitido(config):
        raise ResetRecusadoError("O reset do teste de ponta a ponta não é permitido neste ambiente (RN-67).")
    senhas = ler_senhas(config)
    # RN-50: o usuário da aplicação não tem TRUNCATE; só aqui a API abre uma conexão como dono
    engine = criar_engine(config.MIGRATIONS_DATABASE_URL, poolclass=NullPool)
    try:
        with engine.begin() as conexao:
            conferir_banco(conexao)
            recriar_dados(conexao, senhas)
    except OperationalError as erro:
        if isinstance(erro.orig, (LockNotAvailable, DeadlockDetected)):
            raise ResetOcupadoError from None
        raise
    finally:
        engine.dispose()
    limiter.reset()
    contagem_demo.reset()
