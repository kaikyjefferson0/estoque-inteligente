# Estoque Inteligente

Sistema web de controle de estoque com validade de lotes, alertas e dashboard.

## Stack
- Backend: Python, FastAPI, Uvicorn, SQLAlchemy, Alembic, Psycopg 3, PostgreSQL
- Segurança: Argon2 (hash de senha) e JWT (autenticação)
- Frontend: React, TypeScript, CSS (Vite)
- Deploy: Render (API, frontend e banco em serviços separados)

## Estrutura
- `backend\app\routers`: só HTTP (recebe a requisição e devolve a resposta)
- `backend\app\services`: regras de negócio e transações
- `backend\app\models`: tabelas (SQLAlchemy)
- `backend\app\schemas`: validação de entrada e saída (Pydantic)
- `backend\tests`: testes pytest
- `docs\`: regras de negócio, casos de teste e modelo de dados

## Regras de trabalho
- Responda sempre em português do Brasil.
- Leia `docs\regras-negocio.md` antes de mexer em qualquer regra de estoque.
- Cada caso de teste (CT-xx) de `docs\casos-de-teste.md` deve virar um teste pytest.
- Regra de negócio fica no service, nunca no router.
- Nunca ler, mostrar nem commitar o arquivo `.env`.
- Toda mudança de tabela passa por migration do Alembic.
- O tema visual fica em `frontend\src\styles\theme.css`, a única fonte de cores, espaçamentos, fontes, raios e durações; páginas seguem a skill `frontend-page`.
- Estamos no Windows (cmd): use `py` e caminhos com barra invertida.
- Trabalhe uma fase por vez e explique o que está fazendo; o usuário é o engenheiro e decide a arquitetura.

## Comandos (existem a partir da Fase 3)
- Ativar ambiente: `backend\.venv\Scripts\activate`
- Rodar a API: `uvicorn app.main:app --reload` (dentro de `backend`)
- Testes: `pytest` (dentro de `backend`)
- Migrations: `alembic upgrade head`

## Comandos do frontend (dentro de `frontend`)
- Instalar dependências: `npm install`
- Rodar o site: `npm run dev` (http://localhost:5173)
- Build com checagem de TypeScript: `npm run build`
- Lint: `npm run lint`
- Capturas para o ui-reviewer: `node scripts\capturas-ui.mjs <pasta>`

## Roteiro de fases
- [x] Fase 0: ambiente — concluída
- [x] Fase 1: documentação — concluída
- [x] Fase 2: CLAUDE.md, skills e agentes — concluída
- [x] Fase 3: backend base, Postgres e Alembic — concluída
- [x] Fase 4: usuários, login e perfis (CT-01 a 03) — concluída
- [x] Fase 5: produtos e fornecedores (CT-04 a 06, CT-21 a 26) — concluída
- [x] Fase 6: lotes e entradas (CT-07 a 09, CT-27 a 31) — concluída
- [x] Fase 7: saídas com FEFO (CT-10 a 12, CT-32 a 36) — concluída
- [x] Fase 8: ajustes e histórico imutável (CT-13 a 15) — concluída
- [x] Fase 9: alertas (CT-16 a 19) — concluída
- [x] Fase 10: dashboard (CT-20) — concluída
- [x] Fase 11: frontend React — concluída
- [ ] Fase 12: revisão final e segurança — em andamento (parte A concluída: limite de login, troca de senha e auditoria)
- [ ] Fase 13: deploy no Render e README
