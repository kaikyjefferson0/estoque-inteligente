from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.stock import (
    ExitBatchOut,
    MovementOut,
    ProductStockOut,
    Situacao,
    StockAdjustmentCreate,
    StockAdjustmentOut,
    StockEntryCreate,
    StockEntryOut,
    StockExitCreate,
    StockExitOut,
    StockItemOut,
)
from app.services import stock as service

# RN-18: tudo exige login. RN-46: admin e operador veem a lista de estoque. RN-32: admin e operador registram entradas e saídas; só o admin ajusta.
# RN-12: não existe rota de edição nem de exclusão de movimentações.
router = APIRouter(tags=["stock"], dependencies=[Depends(get_current_user)])


@router.get("/stock", response_model=list[StockItemOut])
def listar_estoque(db: Annotated[Session, Depends(get_db)], situacao: Situacao | None = None):
    return service.listar_estoque(db, situacao=situacao)


@router.post("/stock/entries", response_model=StockEntryOut, status_code=status.HTTP_201_CREATED)
def registrar_entrada(
    dados: StockEntryCreate,
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[User, Depends(get_current_user)],
):
    try:
        resultado = service.registrar_entrada(db, usuario, **dados.model_dump())
    except service.ProdutoNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado. Ele pode ter sido removido; confira o código ou atualize a página.")
    except (service.QuantidadeInvalidaError, service.ValidadeInvalidaError) as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    movimentacao, lote = resultado.movimentacao, resultado.lote
    return StockEntryOut(
        movimentacao_id=movimentacao.id,
        produto_id=movimentacao.produto_id,
        lote_id=lote.id,
        validade=lote.validade,
        quantidade=movimentacao.quantidade,
        quantidade_lote=lote.quantidade,
        saldo_total=resultado.saldo_total,
        usuario_id=movimentacao.usuario_id,
        criado_em=movimentacao.criado_em,
    )


@router.post("/stock/exits", response_model=StockExitOut, status_code=status.HTTP_201_CREATED)
def registrar_saida(
    dados: StockExitCreate,
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[User, Depends(get_current_user)],
):
    try:
        resultado = service.registrar_saida(db, usuario, **dados.model_dump())
    except service.ProdutoNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado. Ele pode ter sido removido; confira o código ou atualize a página.")
    except service.QuantidadeInvalidaError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.SaldoInsuficienteError as erro:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
    primeira = resultado.retiradas[0][0]
    return StockExitOut(
        produto_id=resultado.produto_id,
        quantidade=resultado.quantidade,
        lotes=[
            ExitBatchOut(
                movimentacao_id=movimentacao.id,
                lote_id=lote.id,
                validade=lote.validade,
                quantidade=movimentacao.quantidade,
                quantidade_lote=lote.quantidade,
            )
            for movimentacao, lote in resultado.retiradas
        ],
        saldo_total=resultado.saldo_total,
        usuario_id=primeira.usuario_id,
        criado_em=primeira.criado_em,
    )


@router.post("/stock/adjustments", response_model=StockAdjustmentOut, status_code=status.HTTP_201_CREATED)
def registrar_ajuste(
    dados: StockAdjustmentCreate,
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[User, Depends(require_admin)],
):
    try:
        resultado = service.registrar_ajuste(db, usuario, **dados.model_dump())
    except service.LoteNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lote não encontrado. Atualize a página e escolha o lote de novo.")
    except (service.QuantidadeInvalidaError, service.MotivoObrigatorioError) as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.AjusteSemDiferencaError as erro:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
    movimentacao, lote = resultado.movimentacao, resultado.lote
    return StockAdjustmentOut(
        movimentacao_id=movimentacao.id,
        produto_id=movimentacao.produto_id,
        lote_id=lote.id,
        validade=lote.validade,
        quantidade=movimentacao.quantidade,
        saldo_anterior=movimentacao.saldo_anterior,
        saldo_novo=movimentacao.saldo_novo,
        motivo=movimentacao.motivo,
        saldo_total=resultado.saldo_total,
        usuario_id=movimentacao.usuario_id,
        criado_em=movimentacao.criado_em,
    )


@router.get("/products/{produto_id}/stock", response_model=ProductStockOut)
def consultar_saldo(produto_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        saldo = service.consultar_saldo(db, produto_id)
    except service.ProdutoNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado. Ele pode ter sido removido; confira o código ou atualize a página.")
    return ProductStockOut(
        produto_id=produto_id,
        saldo_fisico=saldo.saldo_fisico,
        saldo_disponivel=saldo.saldo_disponivel,
        lotes=saldo.lotes,
    )


@router.get("/products/{produto_id}/movements", response_model=list[MovementOut])
def listar_movimentacoes(produto_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.listar_movimentacoes(db, produto_id)
    except service.ProdutoNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado. Ele pode ter sido removido; confira o código ou atualize a página.")
