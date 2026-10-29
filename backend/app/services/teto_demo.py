"""RN-57: no modo de demonstração, um teto de cadastros para um visitante não encher o banco."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings

TETO_DEMO = 100


class TetoDoDemoError(Exception):
    pass


def conferir_teto(db: Session, modelo, descricao: str) -> None:
    """Recusa um cadastro novo quando a tabela já tem TETO_DEMO linhas; fora do demo não faz nada."""
    if not settings.DEMO_MODE:
        return
    if db.scalar(select(func.count()).select_from(modelo)) >= TETO_DEMO:
        raise TetoDoDemoError(
            f"A demonstração chegou ao limite de {TETO_DEMO} {descricao}. "
            "Os dados de exemplo voltam ao original uma vez por dia."
        )
