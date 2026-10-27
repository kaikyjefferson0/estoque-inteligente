from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, String, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        # RN-01: só existem os perfis admin e operador
        CheckConstraint("perfil IN ('admin', 'operador')", name="ck_users_perfil"),
        # E-mail sempre salvo em minúsculas (o service normaliza; o banco garante)
        CheckConstraint("email = lower(email)", name="ck_users_email_minusculo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255))
    perfil: Mapped[str] = mapped_column(String(20))
    # RN-21: usuário inativo não entra
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default=true())
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
