"""Modo de demonstração: recriação dos dados de exemplo (RN-54) e contas do demo (RN-55).

A recriação apaga o banco inteiro e o recria pelas migrations, então só roda com DEMO_MODE=true
e com a URL do usuário dono. Os dados de exemplo entram pelos mesmos services da API, para
respeitarem todas as regras (FEFO, lotes, alertas e histórico).
"""

from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from psycopg.errors import LockNotAvailable
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select, text
from sqlalchemy.engine import Connection, Engine, make_url
from sqlalchemy.exc import ArgumentError, OperationalError
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app.core import migracoes
from app.core.clock import hoje
from app.core.database import criar_engine
from app.models.batch import Batch
from app.models.demo_reset import DemoReset
from app.models.product import Product
from app.models.user import User
from app.schemas.users import SENHA_MAXIMA, SENHA_MINIMA, Email
from app.services import alerts, stock
from app.services.products import criar_produto
from app.services.suppliers import criar_fornecedor
from app.services.users import criar_usuario, normalizar_email

# RN-54: a recriação ao iniciar a API só acontece depois deste intervalo
INTERVALO = timedelta(hours=24)
# Chave da trava consultiva do Postgres: duas recriações nunca rodam juntas
# (a API subindo e o comando manual, ou duas instâncias da API)
_CHAVE_DA_TRAVA = 5_400_013_055
# Quanto esperar pela trava de outra recriação antes de desistir (uma recriação leva segundos);
# sem limite, uma trava esquecida deixaria a API subindo para sempre, sem abrir a porta
TEMPO_LIMITE_DA_TRAVA_SEGUNDOS = 60
# RN-55 e pendência da Fase 11: o usuário das capturas do ui-reviewer nunca existe no demo
EMAIL_PROIBIDO = "revisor-ui@estoque.local"

_EMAIL = TypeAdapter(Email)


class DemoRecusadaError(Exception):
    """RN-54: a recriação foi recusada antes de tocar no banco. A mensagem nunca traz segredos."""


class DemoOcupadaError(Exception):
    """RN-54: outra recriação segurou a trava além do tempo limite; nada foi apagado."""


@dataclass(frozen=True)
class ConfigDemo:
    url_dono: str
    app_db_role: str
    admin_email: str
    admin_senha: str
    demo_email: str
    demo_senha: str

    def __repr__(self) -> str:
        # Nunca mostra URL nem senhas num log ou num erro
        return f"ConfigDemo(admin_email={self.admin_email!r}, demo_email={self.demo_email!r})"


def _email(variavel: str, valor: str) -> str:
    if normalizar_email(valor) == EMAIL_PROIBIDO:
        raise DemoRecusadaError(f"{variavel} não pode ser {EMAIL_PROIBIDO} (RN-55).")
    try:
        return normalizar_email(_EMAIL.validate_python(valor))
    except ValidationError:
        raise DemoRecusadaError(f"{variavel} precisa ser um e-mail válido.") from None


def _senha(variavel: str, valor: str) -> str:
    if not SENHA_MINIMA <= len(valor) <= SENHA_MAXIMA:
        raise DemoRecusadaError(f"{variavel} precisa ter de {SENHA_MINIMA} a {SENHA_MAXIMA} caracteres.")
    return valor


def ler_config_demo(config) -> ConfigDemo:
    """RN-54 e RN-55: confere tudo antes de qualquer acesso ao banco. `config` é o settings."""
    if not config.DEMO_MODE:
        raise DemoRecusadaError("Recusando recriar: DEMO_MODE não é true. A recriação apaga todo o banco.")
    if not config.MIGRATIONS_DATABASE_URL_DEFINIDA:
        raise DemoRecusadaError("Recusando recriar: defina MIGRATIONS_DATABASE_URL com a URL do usuário dono do banco.")
    try:
        dono = make_url(config.MIGRATIONS_DATABASE_URL).username
    except ArgumentError:
        raise DemoRecusadaError("MIGRATIONS_DATABASE_URL não é uma URL de banco válida.") from None
    # RN-50: o usuário da aplicação não consegue recriar a estrutura
    if config.APP_DB_ROLE and dono == config.APP_DB_ROLE:
        raise DemoRecusadaError("MIGRATIONS_DATABASE_URL usa o usuário da aplicação; use o usuário dono do banco.")

    faltando = [nome for nome in ("ADMIN_EMAIL", "ADMIN_PASSWORD", "DEMO_PASSWORD") if not getattr(config, nome)]
    if faltando:
        raise DemoRecusadaError(f"Recusando recriar: defina {', '.join(faltando)}.")
    admin_email = _email("ADMIN_EMAIL", config.ADMIN_EMAIL)
    demo_email = _email("DEMO_EMAIL", config.DEMO_EMAIL)
    if admin_email == demo_email:
        raise DemoRecusadaError("ADMIN_EMAIL e DEMO_EMAIL precisam ser diferentes.")
    return ConfigDemo(
        url_dono=config.MIGRATIONS_DATABASE_URL,
        app_db_role=config.APP_DB_ROLE,
        admin_email=admin_email,
        admin_senha=_senha("ADMIN_PASSWORD", config.ADMIN_PASSWORD),
        demo_email=demo_email,
        demo_senha=_senha("DEMO_PASSWORD", config.DEMO_PASSWORD),
    )


@contextmanager
def _travado(engine: Engine) -> Iterator[Connection]:
    """Trava consultiva de sessão, numa conexão só dela (o NullPool fecha a conexão no fim)."""
    with engine.connect() as conexao:
        try:
            # O lock_timeout vale só nesta transação (true = local), que termina logo abaixo
            conexao.execute(
                text("SELECT set_config('lock_timeout', :limite, true)"), {"limite": f"{TEMPO_LIMITE_DA_TRAVA_SEGUNDOS}s"}
            )
            conexao.execute(text("SELECT pg_advisory_lock(:chave)"), {"chave": _CHAVE_DA_TRAVA})
        except OperationalError as erro:
            if isinstance(erro.orig, LockNotAvailable):
                raise DemoOcupadaError(
                    f"Outra recriação da demonstração segurou a trava por mais de {TEMPO_LIMITE_DA_TRAVA_SEGUNDOS} "
                    "segundos. Nada foi apagado; a próxima subida da API tenta de novo."
                ) from None
            raise
        # Sem transação aberta aqui: uma leitura pendente seguraria a tabela e o DROP esperaria para sempre
        conexao.commit()
        try:
            yield conexao
        finally:
            conexao.execute(text("SELECT pg_advisory_unlock(:chave)"), {"chave": _CHAVE_DA_TRAVA})
            conexao.commit()


def ultima_recriacao(conexao: Connection) -> datetime | None:
    """Data da última recriação; None se nunca houve ou se a tabela não existe (recriação interrompida)."""
    try:
        if conexao.scalar(text("SELECT to_regclass('public.demo_resets')")) is None:
            return None
        return conexao.scalar(select(DemoReset.recriado_em).order_by(DemoReset.recriado_em.desc()).limit(1))
    finally:
        conexao.commit()


def precisa_recriar(ultima: datetime | None, agora: datetime) -> bool:
    """RN-54: recria se nunca houve recriação ou se a última passou de 24 horas."""
    return ultima is None or agora - ultima >= INTERVALO


def _recriar(engine: Engine, config: ConfigDemo) -> None:
    migracoes.apagar_estrutura(engine)
    migracoes.aplicar_migrations(engine, config.app_db_role)
    with Session(engine, expire_on_commit=False) as db:
        admin, demo = _criar_contas(db, config)
        _criar_dados_de_exemplo(db, admin, demo)
        # Por último: se algo falhar antes, a próxima subida da API recria de novo
        db.add(DemoReset(recriado_em=datetime.now(timezone.utc)))
        db.commit()


def recriar(config: ConfigDemo) -> None:
    """RN-54: recria na hora (comando manual)."""
    engine = criar_engine(config.url_dono, poolclass=NullPool)
    try:
        with _travado(engine):
            _recriar(engine, config)
    finally:
        engine.dispose()


def recriar_se_preciso(config: ConfigDemo, agora: datetime | None = None) -> bool:
    """RN-54: ao iniciar a API, recria só se a última recriação passou de 24 horas. Devolve se recriou."""
    engine = criar_engine(config.url_dono, poolclass=NullPool)
    try:
        with _travado(engine) as conexao:
            # Conferido já com a trava: quem esperou outra recriação vê a data nova e não repete
            if not precisa_recriar(ultima_recriacao(conexao), agora or datetime.now(timezone.utc)):
                return False
            _recriar(engine, config)
            return True
    finally:
        engine.dispose()


def _criar_contas(db: Session, config: ConfigDemo) -> tuple[User, User]:
    """RN-55: só o admin do dono e a conta de demonstração (operador)."""
    admin = criar_usuario(db, nome="Administrador", email=config.admin_email, senha=config.admin_senha, perfil="admin")
    demo = criar_usuario(db, nome="Visitante da demonstração", email=config.demo_email, senha=config.demo_senha, perfil="operador")
    demo.demo = True
    # RN-55: os ids recomeçam do 1 a cada recriação; marcar a "troca de senha" agora faz
    # qualquer token emitido antes da recriação deixar de valer (mesma regra da RN-48)
    recriado_em = datetime.now(timezone.utc)
    admin.senha_alterada_em = recriado_em
    demo.senha_alterada_em = recriado_em
    db.commit()
    return admin, demo


# --- Dados de exemplo ---

# (nome, CNPJ)
_FORNECEDORES = [
    ("Laticínios Serra Verde", "12345678000195"),
    ("Distribuidora Bom Preço", "45987321000110"),
    ("Higiene & Lar Atacado", None),
]

# (nome, código de barras, estoque mínimo, dias de alerta ou None se não controla validade, fornecedor)
_PRODUTOS = [
    ("Leite integral 1 L", "7896000000011", 24, 10, 0),
    ("Iogurte natural 170 g", "7896000000028", 12, 7, 0),
    ("Queijo muçarela fatiado 150 g", "7896000000035", 10, 10, 0),
    ("Pão de forma tradicional", "7896000000042", 10, 3, 1),
    ("Arroz branco tipo 1 5 kg", "7896000000059", 10, 60, 1),
    ("Feijão carioca 1 kg", "7896000000066", 15, 45, 1),
    ("Café torrado e moído 500 g", "7896000000073", 12, 30, 1),
    ("Refrigerante cola 2 L", "7896000000080", 24, 30, 1),
    ("Biscoito recheado chocolate 130 g", "7896000000097", 15, 20, 1),
    ("Detergente neutro 500 ml", "7896000000103", 20, None, 2),
    ("Sabão em pó 1 kg", "7896000000110", 10, None, 2),
    ("Papel higiênico folha dupla 12 rolos", "7896000000127", 8, None, 2),
]

# (código de barras, quantidade, dias até a validade ou None)
_ENTRADAS = [
    ("7896000000011", 30, 5),  # leite: lote a vencer...
    ("7896000000011", 40, 40),  # ...e outro em dia
    ("7896000000028", 18, 3),  # iogurte a vencer
    ("7896000000035", 14, 25),
    ("7896000000042", 8, 2),  # pão: estoque baixo e a vencer
    ("7896000000059", 25, 300),
    ("7896000000066", 10, 200),  # feijão: estoque baixo
    ("7896000000073", 20, 150),  # café: zera com a saída abaixo
    ("7896000000080", 60, 90),
    ("7896000000097", 40, 15),  # biscoito a vencer
    ("7896000000103", 48, None),
    ("7896000000110", 6, None),  # sabão em pó: estoque baixo
    ("7896000000127", 30, None),
]

# (código de barras, quantidade)
_SAIDAS = [
    ("7896000000011", 12),  # sai do lote que vence antes (FEFO, RN-10)
    ("7896000000080", 18),
    ("7896000000073", 20),  # café sem estoque
    ("7896000000103", 6),
    ("7896000000028", 4),
]


def _criar_dados_de_exemplo(db: Session, admin: User, demo: User) -> None:
    """Fornecedores, produtos e movimentações pelos services da API, com datas relativas a hoje
    em Brasília. As entradas e saídas ficam no nome da conta de demonstração; o ajuste, do admin."""
    dia: date = hoje()
    fornecedores = [criar_fornecedor(db, nome=nome, cnpj=cnpj).id for nome, cnpj in _FORNECEDORES]
    for nome, codigo, minimo, dias_alerta, fornecedor in _PRODUTOS:
        produto = criar_produto(
            db,
            nome=nome,
            codigo_barras=codigo,
            estoque_minimo=minimo,
            controla_validade=dias_alerta is not None,
            dias_alerta_validade=dias_alerta,
            fornecedor_id=fornecedores[fornecedor],
        )
        # RN-40: o produto sem nenhuma entrada já ganha o alerta de estoque baixo
        alerts.gerar_alertas_produto(db, produto.id)
        db.commit()

    for codigo, quantidade, dias in _ENTRADAS:
        validade = dia + timedelta(days=dias) if dias is not None else None
        stock.registrar_entrada(db, demo, codigo, quantidade, validade)
    for codigo, quantidade in _SAIDAS:
        stock.registrar_saida(db, demo, codigo, quantidade)

    # RN-33: inventário do papel higiênico encontrou 2 pacotes avariados
    lote_id = db.scalar(
        select(Batch.id).join(Product, Product.id == Batch.produto_id).where(Product.codigo_barras == "7896000000127")
    )
    stock.registrar_ajuste(db, admin, lote_id, 28, "Contagem do inventário: 2 pacotes avariados")
