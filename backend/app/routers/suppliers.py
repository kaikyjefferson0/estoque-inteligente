from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.limiter import limitar_escrita_da_demo
from app.schemas.comum import IdNaUrl, SemNul
from app.schemas.paginacao import Pagina, Paginacao, paginacao
from app.schemas.suppliers import SupplierCreate, SupplierOut, SupplierReplace, SupplierUpdate
from app.services import suppliers as service

NAO_ENCONTRADO = "Fornecedor não encontrado. Ele pode ter sido removido; atualize a página."

# RN-18: tudo exige login. RN-19: admin e operador cadastram e editam (PATCH ou PUT).
# RN-23 e RN-59: só o admin exclui, e só fornecedor sem produtos vinculados.
router = APIRouter(prefix="/suppliers", tags=["suppliers"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=Pagina[SupplierOut])
def listar(
    db: Annotated[Session, Depends(get_db)],
    pagina: Annotated[Paginacao, Depends(paginacao)],
    busca: Annotated[str | None, SemNul, Query(max_length=120, description="Parte do nome ou do CNPJ")] = None,
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
def obter(fornecedor_id: IdNaUrl, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.obter_fornecedor(db, fornecedor_id)
    except service.FornecedorNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NAO_ENCONTRADO)


@router.patch("/{fornecedor_id}", response_model=SupplierOut, dependencies=[Depends(get_current_user), Depends(limitar_escrita_da_demo)])  # RN-56
def atualizar(fornecedor_id: IdNaUrl, dados: SupplierUpdate, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.atualizar_fornecedor(db, fornecedor_id, dados.model_dump(exclude_unset=True))
    except service.FornecedorNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NAO_ENCONTRADO)
    except service.CnpjInvalidoError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.CnpjJaCadastradoError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este CNPJ já está cadastrado em outro fornecedor. Confira o número.")


@router.put("/{fornecedor_id}", response_model=SupplierOut, dependencies=[Depends(get_current_user), Depends(limitar_escrita_da_demo)])  # RN-56
def substituir(fornecedor_id: IdNaUrl, dados: SupplierReplace, db: Annotated[Session, Depends(get_db)]):
    try:
        return service.substituir_fornecedor(db, fornecedor_id, nome=dados.nome, cnpj=dados.cnpj)
    except service.FornecedorNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NAO_ENCONTRADO)
    except service.CnpjInvalidoError as erro:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(erro))
    except service.CnpjJaCadastradoError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Este CNPJ já está cadastrado em outro fornecedor. Confira o número.")


# require_admin antes do limitador: a conta demo (sempre operador) recebe 403 sem gastar a cota da RN-56
@router.delete(
    "/{fornecedor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_admin), Depends(limitar_escrita_da_demo)],
)
def excluir(fornecedor_id: IdNaUrl, db: Annotated[Session, Depends(get_db)]):
    try:
        service.excluir_fornecedor(db, fornecedor_id)
    except service.FornecedorNaoEncontradoError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NAO_ENCONTRADO)
    except service.FornecedorComProdutosError as erro:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(erro))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
