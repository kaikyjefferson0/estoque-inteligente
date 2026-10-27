from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.schemas.dashboard import DashboardOut
from app.services import dashboard as service

# RN-18 e RN-46: qualquer usuário logado (admin ou operador) vê o dashboard
router = APIRouter(prefix="/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=DashboardOut)
def obter_dashboard(db: Annotated[Session, Depends(get_db)]):
    return service.obter_dashboard(db)
