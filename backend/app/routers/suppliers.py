from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.limiter import limitar_escrita_da_demo
from app.schemas.paginacao import Pagina, Paginacao, paginacao
from app.schemas.suppliers import SupplierCreate, SupplierOut, SupplierUpdate
from app.services import suppliers as service

# RN-18: tudo exige login. RN-19: admin e operador cadastram e editam.
# RN-23: não existe rota de exclusão.
router = APIRouter(prefix="/suppliers", tags=["suppliers"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=Pagina[SupplierOut])
def listar(
    db: Annotated[Session, Depends(get_db)],
    pagina: Annotated[Paginacao, Depends(paginacao)],
    busca: Annotated[str | None, Query(max_length=120, description="Parte do nome ou do CNPJ")] = None,
):
    return service.listar_fornecedores(db, pagina.limite, pagina.deslocamento, busca)


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(limitar_escrita_da_demo)])  # RN-56
def criar(dados: SupplierCreate, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.criar_fornecedor(db, nome=dados.nome, cnpj=dados.cnpj)
    except service.CnpjInvalidoError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.CnpjJaCadastradoError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este CNPJ já está cadastrado em outro fornecedor. Confira o número.")
    except service.TetoDoDemoError as erro:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))


@router.get("/{fornecedor_id}", response_model=SupplierOut)
def obter(fornecedor_id: int, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.obter_fornecedor(db, fornecedor_id)
    except service.FornecedorNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor não encontrado. Ele pode ter sido removido; atualize a página.")


@router.patch("/{fornecedor_id}", response_model=SupplierOut, dependencies=[Depends(get_current_user), Depends(limitar_escrita_da_demo)])  # RN-56
def atualizar(fornecedor_id: int, dados: SupplierUpdate, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.atualizar_fornecedor(db, fornecedor_id, dados.model_dump(exclude_unset=True))
    except service.FornecedorNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fornecedor não encontrado. Ele pode ter sido removido; atualize a página.")
    except service.CnpjInvalidoError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.CnpjJaCadastradoError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este CNPJ já está cadastrado em outro fornecedor. Confira o número.")
