# Pendências

Itens levantados nas revisões que ficaram para fases futuras.

| Origem | Pendência | Fase |
|---|---|---|
| Revisão de segurança da Fase 4 (item 3) | Limitar tentativas de login (`POST /auth/login`) para dificultar força bruta. | Fase 12 |
| Revisão de segurança da Fase 4 (sugestão) | Esconder `/docs`, `/redoc` e `/openapi.json` em produção (por exemplo, `docs_url=None`, `redoc_url=None` e `openapi_url=None` no `FastAPI()` quando o ambiente for produção). | Fase 13 (deploy) |
| Revisão da Fase 6, parte B (item 3) | Teste de concorrência com duas conexões e threads no banco `_test`: duas entradas simultâneas no mesmo lote novo (sem perder quantidade nem duplicar lote) e entrada x `PATCH /products/{id}` mudando "controla validade" (RN-30). Incluir também as saídas (revisão da Fase 7, item 1): duas saídas simultâneas do mesmo produto não podem deixar lote com quantidade negativa nem retirar mais que o saldo disponível, e saída x entrada no mesmo produto. O `conftest.py` usa uma única conexão, então precisa de fixture própria que grave de verdade e limpe no fim. | Fase 12 |
| Revisão de segurança da Fase 8 (item 2) | O trigger de imutabilidade (RN-12) pode ser desligado ou apagado por quem conecta como dono da tabela. Usar um papel do banco para as migrations (dono) e outro para a API, só com `SELECT, INSERT` em `stock_movements` (`REVOKE UPDATE, DELETE, TRUNCATE`); se o plano do Render não permitir, registrar a limitação em `docs\modelo-de-dados.md`. | Fase 12/13 |
| Fase 9 (RN-40) | Agendar a geração completa de alertas (`POST /alerts/generate`) uma vez por dia no Render (Cron Job), para que lotes que passam a vencer sem nenhuma movimentação tenham o alerta atualizado. | Fase 13 (deploy) |
| Revisão da Fase 9 (Importante 1) | Teste de concorrência com duas conexões reais para os alertas: geração completa x saída do mesmo produto e entrada x ajuste no mesmo produto, sem deadlock (ordem das travas: produto consultiva -> linha do produto -> lotes em FOR NO KEY UPDATE). Mesma fixture do item de concorrência acima. | Fase 12 |
| Fase 11, parte A | Testes automáticos do frontend: unidade (client da API, contexto de autenticação, formatação) e ponta a ponta com Playwright (login, rota protegida, 401 levando ao login, gaveta do celular, itens de admin escondidos para o operador, estados de carregando, erro e vazio). O Playwright já está nas devDependencies do frontend. | Fase 12 |
| Fase 11, parte A (revisão de UI) | O usuário `revisor-ui@estoque.local` (admin, usado pelo ui-reviewer para as capturas) existe só no banco de desenvolvimento e **nunca** pode ser criado em produção. No deploy, conferir que ele não existe no banco do Render e não incluir nenhum script ou seed que o crie. | Fase 13 (deploy) |
