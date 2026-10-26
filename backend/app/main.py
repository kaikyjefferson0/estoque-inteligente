from fastapi import FastAPI

app = FastAPI(title="Estoque Inteligente")


@app.get("/health")
def health():
    return {"status": "ok"}
