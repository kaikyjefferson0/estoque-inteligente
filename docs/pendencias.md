# Pendências

Itens levantados nas revisões que ficaram para fases futuras.

## Fase 13 (deploy)

| Origem | Pendência |
|---|---|
| Auditoria da Fase 12, parte A (Importante 2, parte) | Manter 1 processo da API no Render: as contagens dos limites de login (RN-47) e de troca de senha (RN-52) ficam em memória, e com vários processos cada um contaria separado. |
| Fase 13, parte A | Definir `APP_ENV=production` e `TRUST_PROXY_HEADERS=true` no Render (sem elas a API se recusa a subir lá) e conferir os cabeçalhos de segurança numa resposta real da API publicada. |
| Auditoria da Fase 13, parte A (sugestões) | Avaliar: cabeçalhos também no erro 500 (middleware ASGI puro ou handler de `Exception`); 422 sem repetir o `input` (a senha digitada volta na resposta); limite com `moving-window`; `Cache-Control: no-store` e CSP na API em produção; `create_admin` validar o e-mail com o mesmo tipo do `UserCreate`; `.gitignore` com `*.p12`, `*.pfx` e `*.crt`. |
| Fase 12, parte B (RN-50) | Conferir se o Postgres do Render permite criar o usuário da aplicação (`CREATE ROLE ... LOGIN` e `GRANT CONNECT`). Se permitir: API com a `DATABASE_URL` desse usuário, migrations com a `MIGRATIONS_DATABASE_URL` do dono e `APP_DB_ROLE` definida antes do `alembic upgrade head`. Se não permitir: registrar a limitação em `docs\modelo-de-dados.md` (com um usuário só, o dono consegue desligar o trigger da RN-12). |
| Fase 9 (RN-40) | Agendar a geração completa de alertas (`POST /alerts/generate`) uma vez por dia no Render (Cron Job), para que lotes que passam a vencer sem nenhuma movimentação tenham o alerta atualizado. |
| Fase 11, parte A (revisão de UI) | O usuário `revisor-ui@estoque.local` (admin, usado pelo ui-reviewer para as capturas) existe só no banco de desenvolvimento e **nunca** pode ser criado em produção. No deploy, conferir que ele não existe no banco do Render e não incluir nenhum script ou seed que o crie. |
| Auditoria da Fase 12, parte A (Importante 1) | RN-47 no Render: confirmar no primeiro deploy como o proxy monta o `X-Forwarded-For` (rota temporária só de admin mostrando o cabeçalho e o `request.client`, removida depois) e se o último item é mesmo o IP do cliente; se o Render tiver cabeçalho próprio confiável, usar esse. Ler com `request.headers.getlist`. Não usar `uvicorn --forwarded-allow-ips="*"` com `TRUST_PROXY_HEADERS=false`. |

## Depois do deploy

| Origem | Pendência |
|---|---|
| Auditoria da Fase 12, parte A (Importante 2) | Limite de login mais difícil de contornar: agrupar IPv6 pela faixa /64, somar um limite por e-mail normalizado (mesmo 429 genérico, RN-03) e usar Redis em `storage_uri` para poder ter mais de um processo. Registrar a decisão nas regras de negócio. |
| Revisão da Fase 6, parte B (item 3) | Teste de concorrência entre entrada e `PATCH /products/{id}` mudando "controla validade" (RN-30). Entradas e saídas simultâneas já estão cobertas (CT-62 a CT-64); usar a mesma técnica de `tests\test_concorrencia.py` (fixture `sessoes` e função `disputar`). |
| Revisão da Fase 9 (Importante 1) | Teste de concorrência com duas conexões reais para os alertas: geração completa x saída do mesmo produto e entrada x ajuste no mesmo produto, sem deadlock (ordem das travas: produto consultiva -> linha do produto -> lotes em FOR NO KEY UPDATE). Usar a fixture `sessoes` e a função `disputar` de `tests\test_concorrencia.py`. |
| Auditoria da Fase 12, parte A (sugestão) | RN-49: registrar quem redefiniu a senha de outro usuário (ou limitar a redefinição a operadores). |
| Auditoria da Fase 12, parte A (sugestão) | Corrida entre login e troca de senha pelo admin: marcar o `iat` do token no início do login. |
| Fase 12, parte C (resto dos testes do frontend) | Cenários extras do teste de ponta a ponta (`npm run test:e2e`): gaveta do menu no celular, estados de carregando, erro e vazio, e no cadastro de usuários desativar um usuário e a RN-22 (o admin não desativa a si mesmo). |
| Auditoria da Fase 12, parte A (sugestão) | Aceitar o CNPJ no formato alfanumérico da Receita (em uso desde 31/07/2026); hoje a RN-25 aceita só 14 números. **Citar no README como limitação conhecida.** |
