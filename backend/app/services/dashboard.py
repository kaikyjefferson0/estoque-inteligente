from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.clock import hoje  # RN-36: "hoje" em Brasília
from app.models.alert import Alert
from app.models.batch import Batch
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.services import condicoes

ULTIMAS_MOVIMENTACOES = 5


def obter_dashboard(db: Session) -> dict:
    """RN-44 e RN-45: consultas agregadas no banco (nenhuma consulta por produto),
    com as mesmas condições dos alertas e da lista de estoque.

    RN-17: todos os números saem de um único SELECT. No PostgreSQL um comando vê um só
    snapshot, então uma movimentação confirmada no meio não deixa os números incoerentes
    entre si. (REPEATABLE READ não serve aqui: a transação já começou na autenticação.)
    """
    dia = hoje()

    saldos = condicoes.saldos_por_produto(dia).subquery()
    disponivel, minimo = saldos.c.saldo_disponivel, saldos.c.estoque_minimo
    lotes = select(func.count()).select_from(Batch).join(Product, Product.id == Batch.produto_id)
    alertas_ativos = select(func.count()).select_from(Alert).where(Alert.resolvido_em.is_(None))
    numeros = db.execute(
        select(
            func.count().label("total"),
            func.count().filter(condicoes.estoque_baixo(disponivel, minimo)).label("baixo"),
            func.count().filter(disponivel == 0).label("sem_estoque"),
            lotes.where(condicoes.lote_a_vencer(dia)).correlate(None).scalar_subquery().label("a_vencer"),
            lotes.where(condicoes.lote_vencido(dia)).correlate(None).scalar_subquery().label("vencidos"),
            alertas_ativos.correlate(None).scalar_subquery().label("alertas_ativos"),
        ).select_from(saldos)
    ).one()

    movimentacoes = db.execute(
        select(StockMovement, Product.nome, Batch.validade, User.nome)
        .join(Product, Product.id == StockMovement.produto_id)
        .join(Batch, Batch.id == StockMovement.lote_id)
        .join(User, User.id == StockMovement.usuario_id)
        # Movimentações da mesma transação têm o mesmo criado_em; o id desempata
        .order_by(StockMovement.criado_em.desc(), StockMovement.id.desc())
        .limit(ULTIMAS_MOVIMENTACOES)
    )

    return {
        "total_produtos": numeros.total,
        "produtos_estoque_baixo": numeros.baixo,
        "produtos_sem_estoque": numeros.sem_estoque,
        "lotes_a_vencer": numeros.a_vencer,
        "lotes_vencidos": numeros.vencidos,
        "alertas_ativos": numeros.alertas_ativos,
        "ultimas_movimentacoes": [
            {
                "id": mov.id,
                "tipo": mov.tipo,
                "quantidade": mov.quantidade,
                "produto_id": mov.produto_id,
                "produto_nome": produto_nome,
                "lote_id": mov.lote_id,
                "validade": validade,
                "usuario_nome": usuario_nome,
                "criado_em": mov.criado_em,
            }
            for mov, produto_nome, validade, usuario_nome in movimentacoes
        ],
    }
