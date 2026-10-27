from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.stock import MovementOut, ProductStockOut, StockEntryCreate, StockEntryOut
from app.services import stock as service

# RN-18: tudo exige login. RN-32: admin e operador registram entradas.
router = APIRouter(tags=["stock"], dependencies=[Depends(get_current_user)])


@router.post("/stock/entries", response_model=StockEntryOut, status_code=status.HTTP_201_CREATED)
def registrar_entrada(
    dados: StockEntryCreate,
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[User, Depends(get_current_user)],
):
    try:
        resultado = service.registrar_entrada(db, usuario, **dados.model_dump())
    except service.ProdutoNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
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


@router.get("/products/{produto_id}/stock", response_model=ProductStockOut)
def consultar_saldo(produto_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        saldo_total, lotes = service.consultar_saldo(db, produto_id)
    except service.ProdutoNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    return ProductStockOut(produto_id=produto_id, saldo_total=saldo_total, lotes=lotes)


@router.get("/products/{produto_id}/movements", response_model=list[MovementOut])
def listar_movimentacoes(produto_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.listar_movimentacoes(db, produto_id)
    except service.ProdutoNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
