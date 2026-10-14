from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
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
    origin.strip()
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
