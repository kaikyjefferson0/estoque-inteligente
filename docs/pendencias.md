# Pendências

Itens levantados nas revisões que ficaram para fases futuras.

| Origem | Pendência | Fase |
|---|---|---|
| Revisão de segurança da Fase 4 (item 3) | Limitar tentativas de login (`POST /auth/login`) para dificultar força bruta. | Fase 12 |
| Revisão de segurança da Fase 4 (sugestão) | Esconder `/docs`, `/redoc` e `/openapi.json` em produção (por exemplo, `docs_url=None`, `redoc_url=None` e `openapi_url=None` no `FastAPI()` quando o ambiente for produção). | Fase 13 (deploy) |
| Revisão da Fase 6, parte B (item 3) | Teste de concorrência com duas conexões e threads no banco `_test`: duas entradas simultâneas no mesmo lote novo (sem perder quantidade nem duplicar lote) e entrada x `PATCH /products/{id}` mudando "controla validade" (RN-30). Incluir também as saídas (revisão da Fase 7, item 1): duas saídas simultâneas do mesmo produto não podem deixar lote com quantidade negativa nem retirar mais que o saldo disponível, e saída x entrada no mesmo produto. O `conftest.py` usa uma única conexão, então precisa de fixture própria que grave de verdade e limpe no fim. | Fase 12 |
| Revisão de segurança da Fase 8 (item 2) | O trigger de imutabilidade (RN-12) pode ser desligado ou apagado por quem conecta como dono da tabela. Usar um papel do banco para as migrations (dono) e outro para a API, só com `SELECT, INSERT` em `stock_movements` (`REVOKE UPDATE, DELETE, TRUNCATE`); se o plano do Render não permitir, registrar a limitação em `docs\modelo-de-dados.md`. | Fase 12/13 |
| Revisão da Fase 7 | `GET /products/{id}/stock` deve mostrar o saldo físico (com lotes vencidos) e o saldo disponível (sem vencidos). | Fase 10 |
