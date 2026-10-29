from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.security.utils import get_authorization_scheme_param
from limits import parse_many
from limits.storage import MemoryStorage
from limits.strategies import FixedWindowRateLimiter
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import decode_access_token
from app.models.user import User

# RN-47: no máximo 10 tentativas de login por minuto por IP
LIMITE_LOGIN = "10/minute"
# RN-52: no máximo 5 tentativas de troca de senha por minuto por usuário
LIMITE_TROCA_SENHA = "5/minute"
MENSAGEM_LIMITE = "Muitas tentativas. Aguarde um minuto e tente de novo."
# RN-56: alterações da conta de demonstração, por usuário
LIMITE_ESCRITA_DEMO = "30/minute;300/hour"
MENSAGEM_LIMITE_DEMO = "A conta de demonstração fez muitas alterações seguidas. Aguarde um pouco e tente de novo."


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


def usuario_do_token(request: Request) -> str:
    """Chave do limite da troca de senha (RN-52): o usuário dono do token.

    O limite só é contado depois das dependências da rota, então o get_current_user já
    aceitou o token (sem token válido a resposta é 401 e nada é contado). Trocar de IP não
    dá tentativas novas; o IP fica só como reserva, se o token não puder ser lido.
    """
    _, token = get_authorization_scheme_param(request.headers.get("authorization"))
    dados = decode_access_token(token) if token else None
    if dados is None:
        return f"ip:{ip_do_cliente(request)}"
    return f"usuario:{dados.usuario_id}"


# Contagem em memória: vale por processo, suficiente para uma única instância da API
limiter = Limiter(key_func=ip_do_cliente)


def limite_excedido(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(status_code=429, content={"detail": MENSAGEM_LIMITE}, headers={"Retry-After": "60"})


# RN-56: contagem própria em memória (o conftest zera junto com a do limiter)
contagem_demo = MemoryStorage()
_janelas_demo = FixedWindowRateLimiter(contagem_demo)
_limites_demo = parse_many(LIMITE_ESCRITA_DEMO)


def limitar_escrita_da_demo(usuario: Annotated[User, Depends(get_current_user)]) -> None:
    """RN-56: só a conta de demonstração é limitada; confere todas as janelas antes de contar."""
    if not usuario.demo:
        return
    chave = str(usuario.id)
    if not all(_janelas_demo.test(limite, "escrita-demo", chave) for limite in _limites_demo):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=MENSAGEM_LIMITE_DEMO, headers={"Retry-After": "60"}
        )
    for limite in _limites_demo:
        _janelas_demo.hit(limite, "escrita-demo", chave)
