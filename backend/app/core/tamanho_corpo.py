from fastapi import HTTPException
from fastapi.responses import JSONResponse
from starlette.status import HTTP_413_CONTENT_TOO_LARGE
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# RN-64: o maior corpo legítimo da API é o cadastro de usuário (nome de 120, e-mail de 254 e senha de
# 128 caracteres): uns 3,1 KB mesmo com todo caractere escrito como \uXXXX no JSON. 64 KB dá mais de
# 16 vezes essa folga e limita a memória e o trabalho de leitura (JSON ou formulário) de cada requisição.
# Não é ele que protege o Argon2: o service do login recusa e-mail e senha longos antes do hash.
TETO_DO_CORPO = 64 * 1024
MENSAGEM_CORPO_GRANDE = "O envio passou do tamanho máximo aceito (64 KB). Confira os dados e tente de novo."


def _tamanho_declarado(scope: Scope) -> int | None:
    for nome, valor in scope["headers"]:
        if nome == b"content-length":
            try:
                return int(valor)
            except ValueError:
                return None  # o servidor (uvicorn) já recusa um Content-Length inválido
    return None


class LimiteDoCorpo:
    """RN-64: recusa com 413 o corpo acima do teto, antes de ler o JSON (ou o formulário) inteiro.

    Com Content-Length acima do teto, responde sem ler nada. Sem ele (envio em partes, chunked),
    conta os bytes à medida que chegam e para no primeiro pedaço que passa do teto: o HTTPException
    lançado na leitura vira o 413 pelo tratamento de erros do FastAPI.
    """

    def __init__(self, app: ASGIApp, teto: int = TETO_DO_CORPO) -> None:
        self.app = app
        self.teto = teto

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        declarado = _tamanho_declarado(scope)
        if declarado is not None and declarado > self.teto:
            resposta = JSONResponse(status_code=HTTP_413_CONTENT_TOO_LARGE, content={"detail": MENSAGEM_CORPO_GRANDE})
            await resposta(scope, receive, send)
            return

        recebido = 0

        async def receber_com_limite() -> Message:
            nonlocal recebido
            mensagem = await receive()
            if mensagem["type"] == "http.request":
                recebido += len(mensagem.get("body", b""))
                if recebido > self.teto:
                    raise HTTPException(status_code=HTTP_413_CONTENT_TOO_LARGE, detail=MENSAGEM_CORPO_GRANDE)
            return mensagem

        await self.app(scope, receber_com_limite, send)
