from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings

# RN-47: no máximo 10 tentativas de login por minuto por IP
LIMITE_LOGIN = "10/minute"
MENSAGEM_LIMITE = "Muitas tentativas. Aguarde um minuto e tente de novo."


def ip_do_cliente(request: Request) -> str:
    """IP usado como chave do limite.

    Atrás de um proxy confiável (Render), o IP real está no X-Forwarded-For. Usamos o
    último item, que é o que o proxy acrescentou: os anteriores vêm do próprio cliente
    e podem ser inventados para fugir do limite. Fora do proxy, o cabeçalho é ignorado.
    """
    if settings.TRUST_PROXY_HEADERS:
        encaminhado = request.headers.get("x-forwarded-for", "")
        ips = [ip.strip() for ip in encaminhado.split(",") if ip.strip()]
        if ips:
            return ips[-1]
    return get_remote_address(request)


# Contagem em memória: vale por processo, suficiente para uma única instância da API
limiter = Limiter(key_func=ip_do_cliente)


def limite_excedido(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(status_code=429, content={"detail": MENSAGEM_LIMITE}, headers={"Retry-After": "60"})
