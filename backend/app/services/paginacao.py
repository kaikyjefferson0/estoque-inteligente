from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import Row, Select, func, select
from sqlalchemy.orm import Session


@dataclass
class PaginaDeLinhas:
    linhas: Sequence[Row]
    total: int
    limite: int
    deslocamento: int

    def com_itens(self, itens: list) -> dict:
        """Formato das listas da API: { itens, total, limite, deslocamento }."""
        return {"itens": itens, "total": self.total, "limite": self.limite, "deslocamento": self.deslocamento}


def padrao_de_busca(termo: str) -> str:
    """Padrão do ILIKE para "contém o termo", com %, _ e a barra escapados (use escape="\\")."""
    escapado = termo.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escapado}%"


def paginar(db: Session, consulta: Select, limite: int, deslocamento: int) -> PaginaDeLinhas:
    """RN-51: devolve só a página pedida e o total de linhas da consulta (já com os filtros).

    A consulta precisa ter uma ordem total (com o id desempatando) para as páginas
    não repetirem nem pularem itens.
    """
    total = db.scalar(select(func.count()).select_from(consulta.order_by(None).subquery()))
    linhas = db.execute(consulta.limit(limite).offset(deslocamento)).all()
    return PaginaDeLinhas(linhas=linhas, total=total or 0, limite=limite, deslocamento=deslocamento)
