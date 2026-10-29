from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limite_excedido, limiter
from app.routers import alerts, auth, dashboard, products, stock, suppliers, users
from app.services import demo

# Valem para todas as respostas: a API só devolve JSON e nunca é aberta dentro de outra página
CABECALHOS_DE_SEGURANCA = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
}
# Só em produção (HTTPS no Render): em desenvolvimento o navegador guardaria a regra para o localhost
HSTS = "max-age=31536000; includeSubDomains"


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    # RN-54: no modo de demonstração, recria os dados de exemplo se a última recriação passou
    # de 24 horas. Configuração errada impede a API de subir (melhor que um demo quebrado).
    if settings.DEMO_MODE:
        demo.recriar_se_preciso(demo.ler_config_demo(settings))
    yield


def criar_app() -> FastAPI:
    # Em produção a documentação interativa e o esquema da API ficam desligados
    documentacao = not settings.em_producao
    app = FastAPI(
        title="Estoque Inteligente",
        docs_url="/docs" if documentacao else None,
        redoc_url="/redoc" if documentacao else None,
        openapi_url="/openapi.json" if documentacao else None,
        lifespan=ciclo_de_vida,
    )

    # RN-47 e RN-52: limites de tentativas (o decorador fica na rota)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, limite_excedido)

    # O token vai no cabeçalho Authorization (não em cookie), então não há credenciais de cookie
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # Registrado depois do CORS, fica por fora dele e também marca as respostas do preflight
    @app.middleware("http")
    async def cabecalhos_de_seguranca(request: Request, call_next):
        response = await call_next(request)
        response.headers.update(CABECALHOS_DE_SEGURANCA)
        if settings.em_producao:
            response.headers["Strict-Transport-Security"] = HSTS
        return response

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

    return app


app = criar_app()
