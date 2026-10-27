from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import func, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from app.core.clock import hoje
from app.models.alert import Alert
from app.models.batch import Batch
from app.models.product import Product

# Primeira chave do pg_advisory_xact_lock(chave, produto_id): separa as travas de
# alertas de qualquer outra trava consultiva que o sistema venha a usar
_TRAVA_ALERTAS = 9001

# Geração completa: tentativas por produto em deadlock (40P01) ou falha de serialização (40001)
_TENTATIVAS = 3
_ERROS_TRANSITORIOS = {"40P01", "40001"}


@dataclass
class ResultadoGeracao:
    criados: int = 0
    resolvidos: int = 0


def travar_produto(db: Session, produto_id: int) -> None:
    """Trava consultiva do produto até o fim da transação (reentrante na mesma transação).

    Toda operação que muda lotes, produto ou alertas pega esta trava ANTES de qualquer
    trava de linha (produto e depois lotes). Com a ordem sempre igual, não há deadlock entre
    movimentações e a geração de alertas, que insere com FK e por isso trava o lote e o
    produto em KEY SHARE.

    Também faz a geração completa esperar a movimentação do mesmo produto terminar e,
    depois do commit dela, ler o saldo já confirmado (premissa: READ COMMITTED, o padrão
    do PostgreSQL; em REPEATABLE READ o snapshot seria o de antes da espera).
    """
    db.execute(text("SELECT pg_advisory_xact_lock(:chave, :produto_id)"), {"chave": _TRAVA_ALERTAS, "produto_id": produto_id})


def _alertas_esperados(produto: Product, lotes: list[Batch]) -> set[tuple[str, int | None]]:
    """Condições ativas do produto, como pares (tipo, lote_id)."""
    dia = hoje()
    esperados: set[tuple[str, int | None]] = set()

    # RN-13 e RN-41: saldo disponível (sem vencidos; vencer hoje ainda vale, RN-36) <= mínimo
    disponivel = sum(lote.quantidade for lote in lotes if lote.validade is None or lote.validade >= dia)
    if disponivel <= produto.estoque_minimo:
        esperados.add(("estoque_baixo", None))

    if produto.controla_validade:
        limite = dia + timedelta(days=produto.dias_alerta_validade)
        for lote in lotes:
            # RN-42: lote zerado não gera alerta de validade
            if lote.quantidade <= 0 or lote.validade is None:
                continue
            if lote.validade < dia:
                # RN-15: a validade já passou
                esperados.add(("vencido", lote.id))
            elif lote.validade <= limite:
                # RN-14: vence de hoje até hoje + dias de antecedência
                esperados.add(("vencimento_proximo", lote.id))
    return esperados


def gerar_alertas_produto(db: Session, produto_id: int) -> ResultadoGeracao:
    """RN-16 e RN-39: cria os alertas que faltam e resolve os ativos cuja condição acabou.

    Idempotente. Não faz commit: roda dentro da transação de quem chamou (RN-40).
    """
    db.flush()  # mudanças pendentes nos lotes entram na leitura abaixo
    travar_produto(db, produto_id)
    # populate_existing: relê do banco, e não de objetos antigos da sessão
    produto = db.scalars(
        select(Product).where(Product.id == produto_id).execution_options(populate_existing=True)
    ).one()
    lotes = list(
        db.scalars(
            select(Batch).where(Batch.produto_id == produto_id).execution_options(populate_existing=True)
        )
    )
    esperados = _alertas_esperados(produto, lotes)
    ativos = db.execute(
        select(Alert.id, Alert.tipo, Alert.lote_id).where(
            Alert.produto_id == produto_id, Alert.resolvido_em.is_(None)
        )
    ).all()

    resultado = ResultadoGeracao()
    # RN-39 e RN-42: resolve (nunca apaga) o que deixou de valer, como o vencimento próximo
    # de um lote que venceu; os resolvidos saem do índice único parcial
    acabaram = [id_ for id_, tipo, lote_id in ativos if (tipo, lote_id) not in esperados]
    if acabaram:
        resultado.resolvidos = db.execute(
            update(Alert)
            .where(Alert.id.in_(acabaram), Alert.resolvido_em.is_(None))
            .values(resolvido_em=func.now())
            .execution_options(synchronize_session=False)
        ).rowcount

    # RN-16: ON CONFLICT DO NOTHING no índice único parcial dos ativos, então a mesma
    # condição não duplica e duas gerações simultâneas não falham
    faltam = esperados - {(tipo, lote_id) for _, tipo, lote_id in ativos}
    if faltam:
        criados = db.scalars(
            insert(Alert)
            .values([{"tipo": tipo, "produto_id": produto_id, "lote_id": lote_id} for tipo, lote_id in sorted(faltam, key=str)])
            .on_conflict_do_nothing(
                index_elements=["tipo", "produto_id", "lote_id"],
                index_where=Alert.resolvido_em.is_(None),
            )
            .returning(Alert.id)
        ).all()
        resultado.criados = len(criados)
    return resultado


def gerar_alertas(db: Session) -> ResultadoGeracao:
    """RN-40: geração completa, um produto por vez, cada um na sua transação.

    Uma transação por produto evita segurar a trava de todos os produtos de uma vez
    enquanto entradas e saídas acontecem.
    """
    total = ResultadoGeracao()
    for produto_id in db.scalars(select(Product.id).order_by(Product.id)).all():
        for tentativa in range(1, _TENTATIVAS + 1):
            try:
                parcial = gerar_alertas_produto(db, produto_id)
                db.commit()
                break
            except DBAPIError as erro:
                db.rollback()
                # Deadlock ou falha de serialização são transitórios: tenta o produto de novo
                if tentativa == _TENTATIVAS or getattr(erro.orig, "sqlstate", None) not in _ERROS_TRANSITORIOS:
                    raise
            except Exception:
                db.rollback()
                raise
        total.criados += parcial.criados
        total.resolvidos += parcial.resolvidos
    return total


def listar_alertas(
    db: Session,
    tipo: str | None = None,
    produto_id: int | None = None,
    incluir_resolvidos: bool = False,
) -> list[dict]:
    """RN-43: ativos por padrão, do mais recente para o mais antigo, com o nome do produto
    e a validade do lote (quando houver)."""
    consulta = (
        select(Alert, Product.nome, Batch.validade)
        .join(Product, Product.id == Alert.produto_id)
        .outerjoin(Batch, Batch.id == Alert.lote_id)
        .order_by(Alert.criado_em.desc(), Alert.id.desc())
    )
    if not incluir_resolvidos:
        consulta = consulta.where(Alert.resolvido_em.is_(None))
    if tipo is not None:
        consulta = consulta.where(Alert.tipo == tipo)
    if produto_id is not None:
        consulta = consulta.where(Alert.produto_id == produto_id)
    return [
        {
            "id": alerta.id,
            "tipo": alerta.tipo,
            "produto_id": alerta.produto_id,
            "produto_nome": produto_nome,
            "lote_id": alerta.lote_id,
            "validade": validade,
            "criado_em": alerta.criado_em,
            "resolvido_em": alerta.resolvido_em,
        }
        for alerta, produto_nome, validade in db.execute(consulta)
    ]
