from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DemoReset(Base):
    """RN-54: quando os dados de demonstração foram recriados pela última vez.

    A tabela nasce vazia a cada recriação e recebe uma linha no fim dela.
    """

    __tablename__ = "demo_resets"

    id: Mapped[int] = mapped_column(primary_key=True)
    recriado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True))
