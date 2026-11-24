from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.status import HTTP_422_UNPROCESSABLE_CONTENT

# RN-63: só estes campos de cada erro saem na resposta
CAMPOS_DO_ERRO = ("loc", "msg", "type")


async def erro_de_validacao(request: Request, exc: RequestValidationError) -> JSONResponse:
    """RN-63: o 422 de validação no formato {"detail": [{loc, msg, type}]}, que o frontend já lê.

    O handler padrão do FastAPI devolve também "input" (o valor recebido, que pode ser uma senha
    no login, na troca de senha ou no cadastro de usuário) e "ctx" (detalhes internos do validador).
    """
    erros = [{campo: erro.get(campo) for campo in CAMPOS_DO_ERRO} for erro in exc.errors()]
    return JSONResponse(status_code=HTTP_422_UNPROCESSABLE_CONTENT, content={"detail": jsonable_encoder(erros)})
