from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.core.clock import hoje  # RN-31/RN-36: "hoje" em Brasília
from app.models.batch import Batch
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.user import User
from app.services import alerts as alertas
from app.services import condicoes
from app.services.paginacao import padrao_de_busca, paginar
from app.services.products import ProdutoNaoEncontradoError, obter_produto


class QuantidadeInvalidaError(Exception):
    """RN-07."""


class ValidadeInvalidaError(Exception):
    """RN-08 e RN-31."""


class SaldoInsuficienteError(Exception):
    """RN-09 e RN-36."""


class LoteNaoEncontradoError(Exception):
    pass


class MotivoObrigatorioError(Exception):
    """RN-11."""


class AjusteSemDiferencaError(Exception):
    """RN-35."""


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


@dataclass
class ResultadoAjuste:
    movimentacao: StockMovement
    lote: Batch
    saldo_total: int


def _unidades(quantidade: int) -> str:
    return f"{quantidade} unidade" if quantidade == 1 else f"{quantidade} unidades"


def _mensagem_saldo_insuficiente(disponivel: int, pedido: int) -> str:
    # RN-09 e RN-36: o disponível não conta lotes vencidos
    if disponivel == 0:
        return "Não há unidades disponíveis para saída (lotes vencidos não saem). Registre uma entrada antes."
    disponiveis = "disponível" if disponivel == 1 else "disponíveis"
    return f"Saldo insuficiente: há {_unidades(disponivel)} {disponiveis} e foram pedidas {pedido}. Informe até {disponivel}."


def _validar_validade_da_entrada(produto: Product, validade: date | None) -> None:
    if produto.controla_validade:
        # RN-08
        if validade is None:
            raise ValidadeInvalidaError("Este produto controla validade. Informe a data de validade do lote.")
        # RN-31: vencido é validade anterior a hoje (RN-15: "já passou")
        if validade < hoje():
            raise ValidadeInvalidaError("Esta validade já passou e produto vencido não entra no estoque. Informe uma data a partir de hoje.")
    elif validade is not None:
        # RN-31 / RN-27
        raise ValidadeInvalidaError("Este produto não controla validade. Registre a entrada sem data de validade.")


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
        .with_for_update(key_share=True)
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
        raise QuantidadeInvalidaError("Informe uma quantidade maior que zero.")

    produto_id = db.scalar(select(Product.id).where(Product.codigo_barras == codigo_barras.strip()))
    if produto_id is None:
        raise ProdutoNaoEncontradoError(codigo_barras)

    try:
        # Ordem das travas: produto (consultiva) -> linha do produto -> lotes
        alertas.travar_produto(db, produto_id)
        # FOR SHARE: impede que o PATCH mude "controla validade" (RN-30) no meio da entrada.
        # populate_existing: relê do banco mesmo se o produto já estiver na sessão,
        # para validar com o valor atual, e não com um antigo
        produto = db.scalars(
            select(Product)
            .where(Product.id == produto_id)
            .with_for_update(read=True)
            .execution_options(populate_existing=True)
        ).one()
        _validar_validade_da_entrada(produto, validade)

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
        # RN-40: alertas do produto na mesma transação da movimentação
        alertas.gerar_alertas_produto(db, produto.id)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(movimentacao)
    return ResultadoEntrada(movimentacao=movimentacao, lote=lote, saldo_total=saldo)


def _travar_lotes_disponiveis(db: Session, produto_id: int) -> list[Batch]:
    """Trava (FOR UPDATE) os lotes com saldo e disponíveis (RN-36) do produto, sempre por id.

    A ordem fixa evita deadlock entre duas saídas simultâneas do mesmo produto.
    Em READ COMMITTED, quem esperou a trava reavalia "quantidade > 0" com o valor
    já confirmado, então um lote zerado pela outra saída fica de fora.
    """
    return list(
        db.scalars(
            select(Batch)
            .where(Batch.produto_id == produto_id, Batch.quantidade > 0, condicoes.lote_disponivel(hoje()))
            .order_by(Batch.id)
            .with_for_update(key_share=True)
            .execution_options(populate_existing=True)
        )
    )


def _ordem_fefo(lotes: list[Batch]) -> list[Batch]:
    """RN-10: validade mais próxima primeiro; empate ou sem validade, por id."""
    return sorted(lotes, key=lambda lote: (lote.validade is None, lote.validade or date.min, lote.id))


def registrar_saida(db: Session, usuario: User, codigo_barras: str, quantidade: int) -> ResultadoSaida:
    """RN-32: qualquer usuário logado. Retira em FEFO e grava uma movimentação por lote, numa só transação."""
    if quantidade <= 0:
        raise QuantidadeInvalidaError("Informe uma quantidade maior que zero.")

    produto = db.scalars(select(Product).where(Product.codigo_barras == codigo_barras.strip())).one_or_none()
    if produto is None:
        raise ProdutoNaoEncontradoError(codigo_barras)

    try:
        # Ordem das travas: produto (consultiva) -> lotes
        alertas.travar_produto(db, produto.id)
        lotes = _ordem_fefo(_travar_lotes_disponiveis(db, produto.id))
        disponivel = sum(lote.quantidade for lote in lotes)
        # RN-09: recusa antes de mexer em qualquer lote
        if disponivel < quantidade:
            raise SaldoInsuficienteError(_mensagem_saldo_insuficiente(disponivel, quantidade))

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
        # RN-40: alertas do produto na mesma transação da movimentação
        alertas.gerar_alertas_produto(db, produto.id)
        db.commit()
    except Exception:
        db.rollback()
        raise
    for movimentacao, _ in retiradas:
        db.refresh(movimentacao)
    return ResultadoSaida(produto_id=produto.id, quantidade=quantidade, retiradas=retiradas, saldo_total=saldo)


def registrar_ajuste(
    db: Session, usuario: User, lote_id: int, saldo_contado: int, motivo: str
) -> ResultadoAjuste:
    """RN-02/RN-32: só o admin (checado na rota). RN-33: grava o saldo contado do lote
    e a diferença como movimentação, numa só transação. RN-38: vale também para lote vencido."""
    # RN-35
    if saldo_contado < 0:
        raise QuantidadeInvalidaError("Informe quantas unidades você contou, 0 ou mais.")
    # RN-11
    motivo = (motivo or "").strip()
    if not motivo:
        raise MotivoObrigatorioError("Informe o motivo do ajuste, por exemplo “contagem do inventário”.")

    try:
        produto_id = db.scalar(select(Batch.produto_id).where(Batch.id == lote_id))
        if produto_id is None:
            raise LoteNaoEncontradoError(lote_id)
        # Ordem das travas: produto (consultiva) -> lote. O produto do lote nunca muda
        alertas.travar_produto(db, produto_id)
        # FOR NO KEY UPDATE: uma entrada ou saída simultânea no lote espera o ajuste terminar,
        # e o saldo anterior é o valor atual do banco
        lote = db.scalars(
            select(Batch).where(Batch.id == lote_id).with_for_update(key_share=True).execution_options(populate_existing=True)
        ).one_or_none()
        if lote is None:
            raise LoteNaoEncontradoError(lote_id)
        saldo_anterior = lote.quantidade
        diferenca = saldo_contado - saldo_anterior
        # RN-35
        if diferenca == 0:
            raise AjusteSemDiferencaError(
                f"O lote já tem {_unidades(saldo_anterior)}, igual à contagem. Confira a contagem ou cancele o ajuste."
            )

        # RN-37: o lote zerado continua existindo
        lote.quantidade = saldo_contado
        # RN-12 e RN-34: o histórico só recebe inserções, com os saldos antes e depois
        movimentacao = StockMovement(
            produto_id=lote.produto_id,
            lote_id=lote.id,
            tipo="ajuste",
            quantidade=diferenca,
            motivo=motivo,
            saldo_anterior=saldo_anterior,
            saldo_novo=saldo_contado,
            usuario_id=usuario.id,
        )
        db.add(movimentacao)
        db.flush()
        saldo = _saldo_total(db, lote.produto_id)
        # RN-40: alertas do produto na mesma transação da movimentação
        alertas.gerar_alertas_produto(db, lote.produto_id)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(movimentacao)
    return ResultadoAjuste(movimentacao=movimentacao, lote=lote, saldo_total=saldo)


@dataclass
class LoteComSituacao:
    id: int
    validade: date | None
    quantidade: int
    # ok, a_vencer ou vencido, decidido pelas mesmas condições dos alertas (RN-44)
    situacao: str


@dataclass
class SaldoProduto:
    saldo_fisico: int
    saldo_disponivel: int
    lotes: list[LoteComSituacao]


def consultar_saldo(db: Session, produto_id: int) -> SaldoProduto:
    """Saldo físico (com vencidos), saldo disponível (RN-36) e lotes com quantidade,
    em ordem FEFO (lote sem validade por último), cada um com a situação de validade."""
    obter_produto(db, produto_id)
    # Um único "hoje" de Brasília para os saldos e as situações da mesma resposta
    dia = hoje()
    saldos = db.execute(condicoes.saldos_por_produto(dia).where(Product.id == produto_id)).one()
    linhas = db.execute(
        select(Batch.id, Batch.validade, Batch.quantidade, condicoes.situacao_do_lote(dia).label("situacao"))
        .join(Product, Product.id == Batch.produto_id)
        .where(Batch.produto_id == produto_id, Batch.quantidade > 0)
        .order_by(Batch.validade.asc().nulls_last(), Batch.id)
    )
    lotes = [LoteComSituacao(**linha._mapping) for linha in linhas]
    return SaldoProduto(saldo_fisico=saldos.saldo_fisico, saldo_disponivel=saldos.saldo_disponivel, lotes=lotes)


def listar_estoque(
    db: Session, limite: int, deslocamento: int, situacao: str | None = None, busca: str | None = None
) -> dict:
    """RN-44 e CT-48: uma página (RN-51) dos produtos com saldos e situação, numa só consulta agregada.

    CT-50: o filtro "baixo" traz todos com estoque baixo, inclusive os "sem_estoque",
    para bater com o número do dashboard. `busca` filtra por parte do nome ou do código de barras.
    """
    saldos = condicoes.saldos_por_produto(hoje()).subquery()
    situacao_col = condicoes.situacao(saldos.c.saldo_disponivel, saldos.c.estoque_minimo).label("situacao")
    consulta = select(saldos, situacao_col).order_by(saldos.c.nome, saldos.c.produto_id)
    if situacao == condicoes.SITUACAO_BAIXO:
        consulta = consulta.where(condicoes.estoque_baixo(saldos.c.saldo_disponivel, saldos.c.estoque_minimo))
    elif situacao is not None:
        consulta = consulta.where(situacao_col == situacao)
    termo = (busca or "").strip()
    if termo:
        padrao = padrao_de_busca(termo)
        consulta = consulta.where(
            or_(saldos.c.nome.ilike(padrao, escape="\\"), saldos.c.codigo_barras.ilike(padrao, escape="\\"))
        )
    pagina = paginar(db, consulta, limite, deslocamento)
    return pagina.com_itens([dict(linha._mapping) for linha in pagina.linhas])


def listar_movimentacoes(db: Session, produto_id: int, limite: int, deslocamento: int) -> dict:
    """Uma página (RN-51) do histórico do produto, do mais recente para o mais antigo."""
    obter_produto(db, produto_id)
    pagina = paginar(
        db,
        select(StockMovement, Batch.validade, User.nome)
        .join(Batch, Batch.id == StockMovement.lote_id)
        .join(User, User.id == StockMovement.usuario_id)
        .where(StockMovement.produto_id == produto_id)
        # Movimentações da mesma transação têm o mesmo criado_em; o id desempata
        .order_by(StockMovement.criado_em.desc(), StockMovement.id.desc()),
        limite,
        deslocamento,
    )
    return pagina.com_itens([
        {
            "id": mov.id,
            "tipo": mov.tipo,
            "quantidade": mov.quantidade,
            "lote_id": mov.lote_id,
            "validade": validade,
            "motivo": mov.motivo,
            "saldo_anterior": mov.saldo_anterior,
            "saldo_novo": mov.saldo_novo,
            "usuario_id": mov.usuario_id,
            "usuario_nome": usuario_nome,
            "criado_em": mov.criado_em,
        }
        for mov, validade, usuario_nome in pagina.linhas
    ])
