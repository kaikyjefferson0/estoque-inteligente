from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.limiter import limitar_escrita_da_demo
from app.schemas.alerts import AlertGenerationOut, AlertOut, TipoAlerta
from app.schemas.paginacao import Pagina, Paginacao, paginacao
from app.schemas.products import MAX_INTEGER
from app.services import alerts as service

# RN-18 e RN-43: qualquer usuário logado (admin ou operador) vê e gera alertas.
# RN-39: não existe rota para apagar alerta.
router = APIRouter(prefix="/alerts", tags=["alerts"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=Pagina[AlertOut])
def listar_alertas(
    db: Annotated[Session, Depends(get_db)],
    pagina: Annotated[Paginacao, Depends(paginacao)],
    tipo: TipoAlerta | None = None,
    produto_id: Annotated[int | None, Query(ge=1, le=MAX_INTEGER)] = None,
    incluir_resolvidos: bool = False,
):
    return service.listar_alertas(
        db, pagina.limite, pagina.deslocamento, tipo=tipo, produto_id=produto_id, incluir_resolvidos=incluir_resolvidos
    )


@router.post("/generate", response_model=AlertGenerationOut, dependencies=[Depends(limitar_escrita_da_demo)])  # RN-56
def gerar_alertas(db: Annotated[Session, Depends(get_db)]):
    resultado = service.gerar_alertas(db)
    return AlertGenerationOut(criados=resultado.criados, resolvidos=resultado.resolvidos)
