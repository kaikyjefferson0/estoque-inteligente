---
name: new-endpoint
description: Use quando o usuário pedir para criar ou alterar uma rota/endpoint da API FastAPI.
---

Ao criar um endpoint, siga este padrão:

1. **Schemas** em `backend\app\schemas\<recurso>.py`: um para entrada e outro para saída (Pydantic), com validação dos campos.
2. **Service** em `backend\app\services\<recurso>.py`: toda regra de negócio e acesso ao banco fica aqui.
3. **Router** em `backend\app\routers\<recurso>.py`: só recebe a requisição, chama o service e devolve a resposta. Nenhuma regra de negócio no router.
4. **Registro**: incluir o router em `backend\app\main.py`.
5. **Permissões**: toda rota protegida usa a dependência de autenticação; rotas de admin verificam o perfil.
6. **Erros**: usar `HTTPException` com o status correto (404 não encontrado, 409 conflito/duplicado, 422 validação, 403 sem permissão). Mensagens de erro de login são sempre genéricas.
7. **Teste** em `backend\tests\test_<recurso>.py`: um teste por caso de teste (CT-xx) aplicável, nomeado com o ID.
8. Ao terminar, rode `pytest` e informe o resultado.
