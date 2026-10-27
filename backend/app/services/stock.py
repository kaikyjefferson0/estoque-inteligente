from dataclasses import dataclass
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.batch import Batch
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.services.products import ProdutoNaoEncontradoError, obter_produto


class QuantidadeInvalidaError(Exception):
    """RN-07."""


class ValidadeInvalidaError(Exception):
    """RN-08 e RN-31."""


class SaldoInsuficienteError(Exception):
    """RN-09 e RN-36."""


@dataclass
class ResultadoEntrada:
    movimentacao: StockMovement
    lote: Batch
    saldo_total: int


@dataclass
class ResultadoSaida:
    produto_id: int
    quantidade: int
    # Pares (movimentação, lote) em ordem FEFO
    retiradas: list[tuple[StockMovement, Batch]]
    saldo_total: int


# RN-31: "hoje" é o dia em Brasília, não o do servidor (UTC no Render)
FUSO_HORARIO = ZoneInfo("America/Sao_Paulo")


def _agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def hoje() -> date:
    return _agora_utc().astimezone(FUSO_HORARIO).date()


def _validar_validade_da_entrada(produto: Product, validade: date | None) -> None:
    if produto.controla_validade:
        # RN-08
        if validade is None:
            raise ValidadeInvalidaError("Produto controla validade: informe a data de validade.")
        # RN-31: vencido é validade anterior a hoje (RN-15: "já passou")
        if validade < hoje():
            raise ValidadeInvalidaError("Validade já vencida.")
    elif validade is not None:
        # RN-31 / RN-27
        raise ValidadeInvalidaError("Produto não controla validade: não informe a data de validade.")


def _saldo_total(db: Session, produto_id: int) -> int:
    return db.scalar(select(func.coalesce(func.sum(Batch.quantidade), 0)).where(Batch.produto_id == produto_id))


def _travar_lote(db: Session, produto_id: int, validade: date | None) -> Batch:
    """Devolve o lote do produto + validade travado (FOR UPDATE), criando-o se não existir.

    RN-27/RN-28: o INSERT ... ON CONFLICT DO NOTHING usa a unicidade (produto_id, validade),
    então duas entradas simultâneas para um lote novo não criam dois lotes nem dão erro.
    """
    db.execute(
        insert(Batch)
        .values(produto_id=produto_id, validade=validade, quantidade=0)
        .on_conflict_do_nothing(constraint="uq_batches_produto_id_validade")
    )
    return db.scalars(
        select(Batch)
        .where(Batch.produto_id == produto_id, Batch.validade.is_not_distinct_from(validade))
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one()


def registrar_entrada(
    db: Session,
    usuario: User,
    codigo_barras: str,
    quantidade: int,
    validade: date | None = None,
) -> ResultadoEntrada:
    """RN-32: qualquer usuário logado. Soma no lote e grava a movimentação numa só transação."""
    if quantidade <= 0:
        raise QuantidadeInvalidaError("A quantidade deve ser maior que zero.")

    # FOR SHARE: impede que o PATCH mude "controla validade" (RN-30) no meio da entrada.
    # populate_existing: relê do banco mesmo se o produto já estiver na sessão,
    # para validar com o valor atual, e não com um antigo
    produto = db.scalars(
        select(Product)
        .where(Product.codigo_barras == codigo_barras.strip())
        .with_for_update(read=True)
        .execution_options(populate_existing=True)
    ).one_or_none()
    if produto is None:
        raise ProdutoNaoEncontradoError(codigo_barras)
    _validar_validade_da_entrada(produto, validade)

    try:
        lote = _travar_lote(db, produto.id, validade)
        lote.quantidade += quantidade
        # RN-12: o histórico só recebe inserções
        movimentacao = StockMovement(
            produto_id=produto.id,
            lote_id=lote.id,
            tipo="entrada",
            quantidade=quantidade,
            usuario_id=usuario.id,
        )
        db.add(movimentacao)
        db.flush()
        saldo = _saldo_total(db, produto.id)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(movimentacao)
    return ResultadoEntrada(movimentacao=movimentacao, lote=lote, saldo_total=saldo)


def _travar_lotes_com_saldo(db: Session, produto_id: int) -> list[Batch]:
    """Trava (FOR UPDATE) os lotes com saldo do produto, sempre por id.

    A ordem fixa evita deadlock entre duas saídas simultâneas do mesmo produto.
    Em READ COMMITTED, quem esperou a trava reavalia "quantidade > 0" com o valor
    já confirmado, então um lote zerado pela outra saída fica de fora.
    """
    return list(
        db.scalars(
            select(Batch)
            .where(Batch.produto_id == produto_id, Batch.quantidade > 0)
            .order_by(Batch.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    )


def _lotes_disponiveis_fefo(lotes: list[Batch]) -> list[Batch]:
    """RN-36: só lotes dentro da validade (vencer hoje ainda vale).
    RN-10: validade mais próxima primeiro; empate ou sem validade, por id."""
    dia = hoje()
    disponiveis = [lote for lote in lotes if lote.validade is None or lote.validade >= dia]
    return sorted(disponiveis, key=lambda lote: (lote.validade is None, lote.validade or dia, lote.id))


def registrar_saida(db: Session, usuario: User, codigo_barras: str, quantidade: int) -> ResultadoSaida:
    """RN-32: qualquer usuário logado. Retira em FEFO e grava uma movimentação por lote, numa só transação."""
    if quantidade <= 0:
        raise QuantidadeInvalidaError("A quantidade deve ser maior que zero.")

    produto = db.scalars(select(Product).where(Product.codigo_barras == codigo_barras.strip())).one_or_none()
    if produto is None:
        raise ProdutoNaoEncontradoError(codigo_barras)

    try:
        lotes = _lotes_disponiveis_fefo(_travar_lotes_com_saldo(db, produto.id))
        disponivel = sum(lote.quantidade for lote in lotes)
        # RN-09: recusa antes de mexer em qualquer lote
        if disponivel < quantidade:
            raise SaldoInsuficienteError(f"Saldo insuficiente: disponível {disponivel}, pedido {quantidade}.")

        retiradas: list[tuple[StockMovement, Batch]] = []
        restante = quantidade
        for lote in lotes:
            if restante == 0:
                break
            retirar = min(lote.quantidade, restante)
            # RN-37: o lote que zera continua existindo
            lote.quantidade -= retirar
            restante -= retirar
            # RN-12: o histórico só recebe inserções
            movimentacao = StockMovement(
                produto_id=produto.id,
                lote_id=lote.id,
                tipo="saida",
                quantidade=retirar,
                usuario_id=usuario.id,
            )
            db.add(movimentacao)
            retiradas.append((movimentacao, lote))
        db.flush()
        saldo = _saldo_total(db, produto.id)
        db.commit()
    except Exception:
        db.rollback()
        raise
    for movimentacao, _ in retiradas:
        db.refresh(movimentacao)
    return ResultadoSaida(produto_id=produto.id, quantidade=quantidade, retiradas=retiradas, saldo_total=saldo)


def consultar_saldo(db: Session, produto_id: int) -> tuple[int, list[Batch]]:
    """Saldo total e lotes com quantidade, em ordem FEFO (lote sem validade por último)."""
    obter_produto(db, produto_id)
    lotes = list(
        db.scalars(
            select(Batch)
            .where(Batch.produto_id == produto_id, Batch.quantidade > 0)
            .order_by(Batch.validade.asc().nulls_last(), Batch.id)
        )
    )
    return sum(lote.quantidade for lote in lotes), lotes


def listar_movimentacoes(db: Session, produto_id: int) -> list[dict]:
    """Histórico do produto, do mais recente para o mais antigo."""
    obter_produto(db, produto_id)
    linhas = db.execute(
        select(StockMovement, Batch.validade, User.nome)
        .join(Batch, Batch.id == StockMovement.lote_id)
        .join(User, User.id == StockMovement.usuario_id)
        .where(StockMovement.produto_id == produto_id)
        # Movimentações da mesma transação têm o mesmo criado_em; o id desempata
        .order_by(StockMovement.criado_em.desc(), StockMovement.id.desc())
    )
    return [
        {
            "id": mov.id,
            "tipo": mov.tipo,
            "quantidade": mov.quantidade,
            "lote_id": mov.lote_id,
            "validade": validade,
            "motivo": mov.motivo,
            "usuario_id": mov.usuario_id,
            "usuario_nome": usuario_nome,
            "criado_em": mov.criado_em,
        }
        for mov, validade, usuario_nome in linhas
    ]
