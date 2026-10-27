from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.schemas.products import ProductCreate, ProductOut, ProductUpdate
from app.services import products as service

# RN-18: tudo exige login. RN-19: qualquer perfil cadastra, só o admin edita.
# RN-23: não existe rota de exclusão.
router = APIRouter(prefix="/products", tags=["products"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[ProductOut])
def listar(
    db: Annotated[Session, Depends(get_db)],
    busca: Annotated[str | None, Query(max_length=120, description="Parte do nome ou do código de barras")] = None,
):
    return service.listar_produtos(db, busca)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def criar(dados: ProductCreate, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.criar_produto(db, **dados.model_dump())
    except service.DiasAlertaInvalidoError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.FornecedorInexistenteError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Fornecedor informado não existe")
    except service.CodigoBarrasJaCadastradoError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Código de barras já cadastrado")


@router.get("/{produto_id}", response_model=ProductOut)
def obter(produto_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.obter_produto(db, produto_id)
    except service.ProdutoNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")


@router.patch("/{produto_id}", response_model=ProductOut, dependencies=[Depends(require_admin)])
def atualizar(produto_id: int, dados: ProductUpdate, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.atualizar_produto(db, produto_id, dados.model_dump(exclude_unset=True))
    except service.ProdutoNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    except service.DiasAlertaInvalidoError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.FornecedorInexistenteError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Fornecedor informado não existe")
    except service.CodigoBarrasJaCadastradoError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Código de barras já cadastrado")
