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
- Leia `docs\regras-negocio.md` antes de mexer em qualquer regra de estoque.
- Cada caso de teste (CT-xx) de `docs\casos-de-teste.md` deve virar um teste pytest.
- Regra de negócio fica no service, nunca no router.
- Nunca ler, mostrar nem commitar o arquivo `.env`.
- Toda mudança de tabela passa por migration do Alembic.
- Estamos no Windows (cmd): use `py` e caminhos com barra invertida.
- Trabalhe uma fase por vez e explique o que está fazendo; o usuário é o engenheiro e decide a arquitetura.

## Comandos (existem a partir da Fase 3)
- Ativar ambiente: `backend\.venv\Scripts\activate`
- Rodar a API: `uvicorn app.main:app --reload` (dentro de `backend`)
- Testes: `pytest` (dentro de `backend`)
- Migrations: `alembic upgrade head`