from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import alerts, auth, dashboard, products, stock, suppliers, users

app = FastAPI(title="Estoque Inteligente")

# O token vai no cabeçalho Authorization (não em cookie), então não há credenciais de cookie
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# RN-18: /health e /auth/login são as únicas rotas públicas;
# as demais declaram get_current_user ou require_admin.
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(suppliers.router)
app.include_router(products.router)
app.include_router(stock.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
