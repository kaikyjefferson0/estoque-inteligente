# Pendências

Itens levantados nas revisões que ficaram para fases futuras.

| Origem | Pendência | Fase |
|---|---|---|
| Revisão de segurança da Fase 4 (item 3) | Limitar tentativas de login (`POST /auth/login`) para dificultar força bruta. | Fase 12 |
| Revisão de segurança da Fase 4 (sugestão) | Esconder `/docs`, `/redoc` e `/openapi.json` em produção (por exemplo, `docs_url=None`, `redoc_url=None` e `openapi_url=None` no `FastAPI()` quando o ambiente for produção). | Fase 13 (deploy) |
| Revisão da Fase 6, parte B (item 3) | Teste de concorrência com duas conexões e threads no banco `_test`: duas entradas simultâneas no mesmo lote novo (sem perder quantidade nem duplicar lote) e entrada x `PATCH /products/{id}` mudando "controla validade" (RN-30). O `conftest.py` usa uma única conexão, então precisa de fixture própria que grave de verdade e limpe no fim. | Fase 12 |
