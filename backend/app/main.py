from fastapi import FastAPI

from app.routers import auth, users

app = FastAPI(title="Estoque Inteligente")

# RN-18: /health e /auth/login são as únicas rotas públicas;
# as demais declaram get_current_user ou require_admin.
app.include_router(auth.router)
app.include_router(users.router)


@app.get("/health")
def health():
    return {"status": "ok"}
