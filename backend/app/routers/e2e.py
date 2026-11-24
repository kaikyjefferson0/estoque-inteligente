from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status

from app.core.config import settings
from app.services import e2e_reset as service

# RN-67: sem login, porque apaga até as contas. Só é registrada no ambiente do teste de ponta a
# ponta (app.main); fora dele a rota não existe (404).
router = APIRouter(prefix="/_test", tags=["_test"], include_in_schema=False)


@router.post("/reset", status_code=status.HTTP_204_NO_CONTENT)
def resetar(x_e2e_reset: Annotated[str | None, Header()] = None) -> None:
    # Uma página aberta em outra aba poderia mandar um POST simples para o localhost. O cabeçalho
    # próprio obriga o preflight, e o CORS da API não o libera
    if x_e2e_reset != "1":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Falta o cabeçalho X-E2E-Reset.")
    try:
        service.resetar(settings)
    except service.ResetOcupadoError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="O banco do teste está ocupado por outra operação. Nada foi apagado; tente de novo.",
        )
