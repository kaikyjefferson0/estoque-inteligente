
import os
import secrets

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import password_hash
from app.models.user import User
from app.routers.category import router as category_router
from app.routers.product import router as product_router
from app.routers.supplier import router as supplier_router
from app.routers.lot import router as lot_router
from app.routers.movement import router as movement_router
from app.routers.user import router as user_router
from app.routers.alert import router as alert_router
from app.routers.auth import router as auth_router


app = FastAPI(
    title="Estoque Inteligente API",
    description="API para gerenciamento inteligente de estoque",
    version="1.0.0",
)

cors_origins = [
    origin.strip().rstrip("/")
    for origin in settings.cors_origins.split(",")
    if origin.strip()
]

frontend_origin = "https://estoque-inteligente-web.onrender.com"

if frontend_origin not in cors_origins:
    cors_origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(supplier_router)
app.include_router(product_router)
app.include_router(category_router)
app.include_router(lot_router)
app.include_router(movement_router)
app.include_router(user_router)
app.include_router(alert_router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {"message": "Estoque Inteligente API funcionando!"}


@app.get("/health/database")
async def database_health(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(text("SELECT 1"))
    value = result.scalar_one()

    return {
        "database": "connected",
        "result": value,
    }


class AdminBootstrapRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=12, max_length=128)


@app.post("/_internal/admin-bootstrap")
async def admin_bootstrap(
    data: AdminBootstrapRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    token = os.getenv("ADMIN_BOOTSTRAP_TOKEN")
    supplied_token = request.headers.get("X-Bootstrap-Token", "")

    if not token or not secrets.compare_digest(supplied_token, token):
        raise HTTPException(status_code=404, detail="Not found")

    email = data.email.strip().lower()

    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(
            status_code=400,
            detail="Informe um e-mail válido.",
        )

    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    hashed_password = password_hash.hash(data.password)

    if user is None:
        user = User(
            name=data.name.strip(),
            email=email,
            password_hash=hashed_password,
            role="admin",
            active=True,
        )
        db.add(user)
    else:
        user.name = data.name.strip()
        user.password_hash = hashed_password
        user.role = "admin"
        user.active = True

    await db.commit()

    return {
        "ok": True,
        "email": user.email,
        "role": user.role,
        "active": user.active,
    }

