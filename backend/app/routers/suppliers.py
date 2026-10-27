from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas.suppliers import SupplierCreate, SupplierOut, SupplierUpdate
from app.services import suppliers as service

# RN-18: tudo exige login. RN-19: qualquer perfil cadastra, só o admin edita.
# RN-23: não existe rota de exclusão.
router = APIRouter(prefix="/suppliers", tags=["suppliers"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[SupplierOut])
def listar(db: Annotated[Session, Depends(get_db)]):
    return service.listar_fornecedores(db)


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def criar(dados: SupplierCreate, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.criar_fornecedor(db, nome=dados.nome, cnpj=dados.cnpj)
    except service.CnpjInvalidoError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.CnpjJaCadastradoError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CNPJ já cadastrado")


@router.get("/{fornecedor_id}", response_model=SupplierOut)
def obter(fornecedor_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.obter_fornecedor(db, fornecedor_id)
    except service.FornecedorNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor não encontrado")


@router.patch("/{fornecedor_id}", response_model=SupplierOut, dependencies=[Depends(get_current_user)])
def atualizar(fornecedor_id: int, dados: SupplierUpdate, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.atualizar_fornecedor(db, fornecedor_id, dados.model_dump(exclude_unset=True))
    except service.FornecedorNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor não encontrado")
    except service.CnpjInvalidoError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.CnpjJaCadastradoError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CNPJ já cadastrado")
