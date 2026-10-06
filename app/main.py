from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.routers.category import router as category_router
from app.routers.product import router as product_router
from app.routers.supplier import router as supplier_router
from app.routers.lot import router as lot_router
from app.routers.movement import router as movement_router
from app.routers.user import router as user_router
from app.routers.alert import router as alert_router


app = FastAPI(
    title="Estoque Inteligente API",
    description="API para gerenciamento inteligente de estoque",
    version="1.0.0",
)


app.include_router(supplier_router)
app.include_router(product_router)
app.include_router(category_router)
app.include_router(lot_router)
app.include_router(movement_router)
app.include_router(user_router)
app.include_router(alert_router)


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
    
    
    
    
    