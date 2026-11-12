# Estoque Inteligente

[![CI](https://github.com/kaikyjefferson0/estoque-inteligente/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/kaikyjefferson0/estoque-inteligente/actions/workflows/ci.yml)

![Python 3.14](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL 18](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)
![React 19.3.1](https://img.shields.io/badge/React-19.3.1-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS 4.3.5](https://img.shields.io/badge/Tailwind%20CSS-4.3.5-06B6D4?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)

Sistema web de controle de estoque com lotes e validade, alertas automáticos e painel, pensado para o pequeno comércio. A saída usa o lote que vence primeiro, o histórico não pode ser apagado e a tela mostra em dias o que está para vencer.

## Teste agora

| | Endereço |
|---|---|
| Site | **https://estoque-site-4qap.onrender.com** |
| API | https://estoque-api-pqbo.onrender.com |
| Documentação da API (Swagger) | `/docs`, só no ambiente local: http://localhost:8000/docs (em produção fica desligada) |
| Saúde da API | https://estoque-api-pqbo.onrender.com/health |

Entre com a conta de demonstração (perfil operador):

| Conta de demonstração | |
|---|---|
| E-mail | `demo@estoque-inteligente.com` |
| Senha | `Demo-Estoque-2026` |

Na tela de login, o botão "Entrar como demonstração" entra direto, sem digitar nada.

> O primeiro acesso pode levar até um minuto: no plano gratuito do Render, a API "dorme" quando fica ociosa e precisa acordar. As telas mostram um estado de carregando enquanto isso. Os dados de demonstração são recriados do zero uma vez por dia.

## Capturas de tela

| Painel, com a régua de vencimentos | Estoque, com a situação de cada produto |
|---|---|
| ![Painel com os números de estoque baixo, a vencer e vencidos, a régua dos próximos 21 dias com os dias de vencimento circulados e as últimas movimentações](docs/imagens/painel.webp) | ![Lista de estoque com busca, filtros Todos, Estoque baixo e Sem estoque, e saldo, mínimo e situação de cada produto](docs/imagens/estoque.webp) |

| Detalhe do produto, com lotes e histórico | Entrada pelo código de barras |
|---|---|
| ![Detalhe do Leite integral 1 L com o cadastro, o saldo disponível e físico, dois lotes com a validade de cada um e o histórico de movimentações](docs/imagens/produto-detalhe.webp) | ![Tela de entrada com o código de barras lido, o produto encontrado, o saldo disponível e os campos de quantidade e validade](docs/imagens/entrada.webp) |

| Alertas de vencimento e estoque baixo | Usuários (só admin) |
|---|---|
| ![Lista de alertas ativos com filtros por tipo: sem estoque, vencimento próximo com a validade do lote e estoque baixo](docs/imagens/alertas.webp) | ![Lista de usuários com perfil, situação e as ações de editar e definir nova senha](docs/imagens/usuarios.webp) |

No celular (390 px), com a folha do mês e a barra inferior:

| Painel, com a régua virada folha do mês | Alertas, com a barra inferior |
|---|---|
| ![Painel no celular com a régua de vencimentos em três semanas de sete dias e a barra inferior com Painel, Entrada, Saída, Alertas e Mais](docs/imagens/painel-celular.webp) | ![Alertas no celular com os filtros em grade de dois por dois e a barra inferior com Alertas marcado](docs/imagens/alertas-celular.webp) |

## Destaques

- **FEFO:** a saída usa primeiro o lote que vence primeiro, e o saldo nunca fica negativo.
- **Alertas automáticos:** estoque baixo, vencimento próximo e vencido, sem repetição.
- **Painel com régua de vencimentos:** os próximos 21 dias, com os dias em que vencem lotes circulados e a quantidade de lotes embaixo de cada um.
- **Histórico imutável:** nenhuma movimentação pode ser alterada ou apagada, nem pelo próprio sistema.
- **Segurança:** login com JWT, senhas com Argon2, perfis admin e operador, limite de tentativas de login e menor privilégio no banco.
- **Feito para o celular:** barra inferior com as tarefas do dia a dia e telas que funcionam a partir de 320 px.
- **Acessibilidade conferida:** contraste de pelo menos 4,5:1, foco visível pelo teclado e situação sempre escrita, nunca só na cor.
- **Qualidade:** 378 testes automatizados, entre backend, frontend e ponta a ponta, rodando no CI a cada push e pull request.

## Tecnologias

| Camada | Tecnologias |
|---|---|
| Backend | Python, FastAPI, Uvicorn, SQLAlchemy, Alembic, Pydantic |
| Banco de dados | PostgreSQL, com Psycopg 3 |
| Segurança | Argon2 (hash de senha), JWT com PyJWT (autenticação) e SlowAPI (limite de tentativas) |
| Frontend | React, TypeScript, Vite e React Router |
| Interface | Tailwind CSS v4 com design system próprio, Radix UI e Tabler Icons |
| Testes | pytest (backend), Vitest + Testing Library (unidade do frontend) e Playwright (ponta a ponta) |
| Qualidade de código | oxlint, com a regra que recusa classes com valores fora do tema |
| Infraestrutura | Docker e Docker Compose (ambiente local completo) e GitHub Actions (CI com os três tipos de teste a cada push e pull request) |
| Deploy | API e site no Render (plano gratuito, com a Cloudflare à frente) e banco PostgreSQL no Neon |

### O que há de novo na interface

- **Tailwind v4 ligado ao tema.** O `theme.css` é a única fonte de cores, espaçamentos, fontes, raios e durações, e o `@theme inline` do `tailwind.css` só aponta para essas variáveis. Os padrões do Tailwind estão desligados, e o lint recusa valores soltos como `p-[13px]`: toda classe usa um token do tema.
- **Migração gradual.** As telas passam para o Tailwind uma a uma; as que ainda não migraram seguem com o CSS delas, sem misturar os dois na mesma propriedade.
- **Radix UI** nos diálogos de confirmação, na gaveta do menu e no menu da conta: o foco fica preso dentro da janela aberta, o Esc fecha e o foco volta para o botão que abriu.
- **Componentes novos:** a régua de vencimentos do Painel, a barra inferior (até 900 px) e a mini-folha de data nas movimentações.

## Interface e design

A identidade visual se chama **"Folhinha"**: a tela se veste como a folhinha pendurada perto do caixa, porque o que o sistema controla é validade lida em dias.

- **Papel e tinta.** Fundo branco, texto quase preto, fios finos e nenhum cartão com sombra.
- **Cor só para situação.** Vermelho só para o que está crítico (sem estoque, vencido, erro), âmbar para atenção e verde para em dia. Toda situação também vem escrita e com um ícone de forma própria.
- **Fonte e numerais.** Uma só família (Archivo): letra calma na interface e números estreitos e pesados, como os de calendário.
- **O dia como figura principal.** Na régua de vencimentos, hoje fica em placa preta e os dias em que vencem lotes ficam circulados, como o dia marcado à caneta.
- **Navegação.** No computador, menu lateral com a página atual circulada; no celular, a barra inferior com Painel, Entrada, Saída, Alertas e Mais.

A interface foi revisada nas 16 telas em 320, 768 e 1280 px, com os estados de carregando, erro e vazio: sem rolagem horizontal, sem contraste abaixo de 4,5:1, sem alvo de toque pequeno e sem controle sem nome.

As regras completas estão no [DESIGN.md](DESIGN.md), e o propósito e o público do produto, no [PRODUCT.md](PRODUCT.md).

## API: rotas HTTP

Todas as rotas exigem login com token JWT (no cabeçalho `Authorization: Bearer`), exceto `/auth/login` e `/health`. A documentação interativa (Swagger) fica desligada em produção; rode o projeto localmente e abra http://localhost:8000/docs. As marcadas com **(admin)** só aceitam o perfil admin.

| Método | Rota | O que faz |
|---|---|---|
| GET | `/health` | Confere se a API está no ar (pública) |
| POST | `/auth/login` | Entra com e-mail e senha e devolve o token (pública; até 10 tentativas por minuto por IP) |
| GET | `/auth/me` | Dados do usuário logado |
| POST | `/auth/change-password` | Troca a própria senha |
| GET | `/users` | Lista os usuários (admin) |
| POST | `/users` | Cadastra um usuário (admin) |
| GET | `/users/{usuario_id}` | Dados de um usuário (admin) |
| PATCH | `/users/{usuario_id}` | Altera nome, perfil ou situação (ativo) de um usuário (admin) |
| POST | `/users/{usuario_id}/password` | Define uma nova senha para outro usuário (admin) |
| GET | `/suppliers` | Lista os fornecedores, com busca por nome ou CNPJ |
| POST | `/suppliers` | Cadastra um fornecedor |
| GET | `/suppliers/{fornecedor_id}` | Dados de um fornecedor |
| PATCH | `/suppliers/{fornecedor_id}` | Edita um fornecedor |
| GET | `/products` | Lista os produtos, com busca por nome ou código de barras |
| POST | `/products` | Cadastra um produto |
| GET | `/products/by-barcode/{codigo_barras}` | Busca um produto pelo código de barras |
| GET | `/products/{produto_id}` | Dados de um produto |
| PATCH | `/products/{produto_id}` | Edita um produto |
| GET | `/products/{produto_id}/stock` | Saldo físico e disponível do produto e os lotes, na ordem FEFO |
| GET | `/products/{produto_id}/movements` | Histórico de movimentações do produto |
| GET | `/stock` | Lista o saldo de cada produto, com busca |
| POST | `/stock/entries` | Registra uma entrada pelo código de barras |
| POST | `/stock/exits` | Registra uma saída, tirando dos lotes pela ordem FEFO |
| POST | `/stock/adjustments` | Ajusta um lote pelo saldo contado, com motivo (admin) |
| GET | `/alerts` | Lista os alertas, com filtro por tipo e produto e opção de incluir os resolvidos |
| POST | `/alerts/generate` | Verifica o estoque agora: cria os alertas novos e resolve os que deixaram de valer |
| GET | `/dashboard` | Números do painel, calculados na hora |

## Arquitetura e decisões técnicas

**Camadas no backend.** O código é separado por responsabilidade: `routers` só cuidam do HTTP (recebem a requisição e devolvem a resposta), `services` concentram as regras de negócio e as transações, `models` descrevem as tabelas (SQLAlchemy) e `schemas` validam entrada e saída (Pydantic). Nenhuma regra de negócio mora no router.

**As regras também no banco.** Além das validações da aplicação, o PostgreSQL garante as invariantes com *constraints* e *triggers*: o histórico de movimentações não aceita UPDATE nem DELETE, os saldos não ficam negativos e as relações entre produto, lote e movimentação são protegidas. Assim as regras valem mesmo diante de um acesso fora da API.

**Menor privilégio no banco.** A aplicação pode rodar com dois usuários: o *dono* aplica as migrations (DDL) e um *usuário da aplicação* só tem o necessário para ler e gravar dados, sem poder alterar a estrutura. Isso limita o estrago de uma eventual falha na API. As permissões do usuário da aplicação são sincronizadas e verificadas a cada deploy e, se estiverem erradas, a API não sobe.

**Concorrência.** Entradas, saídas e ajustes simultâneos sobre o mesmo produto são serializados com travas de linha (`FOR NO KEY UPDATE`) numa ordem fixa de aquisição, evitando *deadlocks* e condições de corrida no saldo. Há testes com duas conexões reais cobrindo esses cenários.

**Limite de login com o IP real.** O login aceita no máximo 10 tentativas por minuto por IP. Atrás do proxy do Render (com a Cloudflare à frente), o IP vem do cabeçalho `True-Client-Ip` (ou `Cf-Connecting-Ip`), definidos pela Cloudflare. O `X-Forwarded-For` é deliberadamente ignorado, porque o proxy apenas acrescenta itens ao que o cliente enviou e ele poderia ser falsificado para ganhar tentativas novas.

**Partida a frio.** No plano gratuito, a API hiberna quando fica ociosa, e o Neon também suspende o banco sem uso. O frontend trata a primeira resposta lenta com tolerância e estado de carregando, e há um teste específico para esse comportamento.

**Modo de demonstração.** Com `DEMO_MODE` ligado, a API recria todo o banco com dados de exemplo pelas próprias regras (FEFO, lotes, alertas e histórico) uma vez por dia, e a conta de demonstração tem a troca de senha bloqueada. É o que mantém o site público sempre com dados coerentes e sem acúmulo.

**Código de barras sem espaços, em três camadas.** Um código copiado da tela ou de uma etiqueta pode vir com espaços ("3037 3543"), e ele precisa valer igual a "30373543". O site tira os espaços antes de enviar, a API tira de novo antes de validar (ao cadastrar, editar, buscar e registrar entrada ou saída) e o banco tem uma *CHECK constraint* que recusa código com espaço, mesmo num INSERT feito fora da API. A migration que criou essa regra limpou antes os códigos já gravados, e para sem alterar nada se a limpeza deixasse dois produtos com o mesmo código.

## Qualidade

Os números abaixo refletem a suíte atual do projeto:

- **Backend — pytest: 272 testes.** Cobrem as regras de negócio (cada caso de teste `CT-xx` da documentação vira um teste), os *services* e as rotas, autenticação e perfis, segurança HTTP e CORS, paginação, concorrência com conexões reais, permissões do banco, partida a frio, o modo de demonstração e a migration e a *constraint* do código de barras sem espaços.
- **Frontend — Vitest: 80 testes.** Cobrem o cliente de API, a formatação e o fuso das datas (rodam com o computador no fuso de Tóquio para provar que as datas seguem America/Sao_Paulo), a paginação, a página de demonstração, a leitura do código de barras e a régua de vencimentos.
- **Ponta a ponta — Playwright: 26 testes.** Rodam contra a API e um banco reais (recriado a cada execução), seguindo fluxos completos de cadastro, entrada, saída, ajuste e alertas, o código de barras copiado de uma lista e colado na busca da entrada, a barra inferior do celular e a responsividade das telas.

## Rodando com Docker

Pré-requisito: Docker com o Compose (no Windows, o Docker Desktop aberto). Na raiz do projeto:

```
docker compose up --build -d
```

Pronto: o comando sobe o PostgreSQL 18, a API e o site, sem precisar de `.env`. Ao subir, a API cria as tabelas pelas migrations, os dados de exemplo e as contas abaixo.

- **Site:** http://localhost:8080 (o botão "Entrar como demonstração" entra direto)
- **API:** http://localhost:8000 (documentação em http://localhost:8000/docs)

| Conta local | E-mail | Senha |
|---|---|---|
| Operador de demonstração | `demo@exemplo.com.br` | `demo-local-docker` |
| Admin | `admin@exemplo.com.br` | `admin-local-docker` |

Comandos úteis:

```
docker compose logs -f api                               (acompanhar os logs da API)
docker compose down                                      (parar, mantendo os dados)
docker compose down -v                                   (parar e apagar os dados)
docker compose exec api python -m app.scripts.reset_demo (recriar os dados de exemplo na hora)
```

Bom saber:

- **Os dados locais são de demonstração.** O ambiente roda com `DEMO_MODE=true`: os dados ficam no volume entre um `down` e um `up`, mas a API apaga e recria tudo ao subir se a última recriação passou de 24 horas (RN-54). Os limites da demonstração (RN-56 e RN-57) também valem aqui.
- **Só para uso local.** As senhas e a `SECRET_KEY` padrão são públicas, por isso as portas só abrem em `127.0.0.1` e o banco não tem porta publicada (não conflita com um PostgreSQL instalado na 5432).
- **Isolado de outros bancos.** O Compose não lê o `backend\.env` e as URLs do banco apontam sempre para o contêiner `db`.
- **Para mudar portas, contas ou senhas,** copie o `.env.example` da raiz para `.env` e preencha só o que quiser (veja as instruções no arquivo). Se a porta 8000 ou 8080 estiver ocupada, é só definir `API_PORT` ou `SITE_PORT`.

O deploy em produção não usa estes arquivos: veja o [guia de deploy](docs/deploy.md).

## Como rodar localmente (Windows)

Pré-requisitos: Python 3.14, Node.js 24 e PostgreSQL instalados.

1. **Banco de dados.** Crie um banco no PostgreSQL (por exemplo, `estoque_inteligente`).

2. **Backend — ambiente e dependências** (dentro de `backend`):
   ```
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt -r requirements-dev.txt
   ```

3. **Variáveis de ambiente.** Copie `backend\.env.example` para `backend\.env` e preencha os valores reais (pelo menos `DATABASE_URL` e `SECRET_KEY`; gere a chave com `py -c "import secrets; print(secrets.token_hex(32))"`).

4. **Migrations e primeiro admin** (dentro de `backend`, com o ambiente ativo):
   ```
   alembic upgrade head
   py -m app.scripts.create_admin
   ```

5. **Rodar a API** (dentro de `backend`):
   ```
   uvicorn app.main:app --reload
   ```

6. **Frontend** (dentro de `frontend`):
   ```
   npm install
   ```
   Crie um arquivo `.env` com `VITE_API_URL=http://localhost:8000` e rode:
   ```
   npm run dev
   ```
   O site abre em http://localhost:5173.

7. **Bancos dos testes.** Os testes automatizados nunca usam o banco de desenvolvimento: eles apagam e recriam o banco a cada execução, por isso cada um tem uma trava que recusa rodar se o nome do banco não terminar no sufixo esperado. Os valores de exemplo de todas as variáveis abaixo estão em `backend\.env.example`.

   - **pytest:** precisa de um banco com nome terminado em `_test`, configurado em `TEST_DATABASE_URL` com o usuário dono do banco (as migrations rodam nele). Sem essa variável, ou com outro nome de banco, o pytest para antes de começar.
   - **`npm run test:e2e`:** precisa do banco `estoque_e2e`, de um usuário da aplicação separado do dono e de três variáveis: `E2E_DATABASE_URL` (o dono), `E2E_APP_DATABASE_URL` (o usuário da aplicação, no mesmo banco) e `APP_DB_ROLE` (o nome desse usuário). O teste sobe a API com o usuário da aplicação, como em produção.
   - **Opcional:** `TEST_APP_DATABASE_URL` (o banco `_test` com o usuário da aplicação) liga os testes de permissão do banco; sem ela, esses testes são pulados.

   Para criar os bancos, no `psql` como `postgres` (troque as senhas):
   ```sql
   CREATE ROLE estoque LOGIN PASSWORD 'senha-do-dono';
   CREATE ROLE estoque_app LOGIN PASSWORD 'senha-da-aplicacao';
   CREATE DATABASE estoque_inteligente_test OWNER estoque;
   CREATE DATABASE estoque_e2e OWNER estoque;
   GRANT CONNECT ON DATABASE estoque_inteligente_test TO estoque_app;
   GRANT CONNECT ON DATABASE estoque_e2e TO estoque_app;
   ```
   E no `backend\.env`:
   ```
   TEST_DATABASE_URL=postgresql+psycopg://estoque:senha-do-dono@localhost:5432/estoque_inteligente_test
   TEST_APP_DATABASE_URL=postgresql+psycopg://estoque_app:senha-da-aplicacao@localhost:5432/estoque_inteligente_test
   APP_DB_ROLE=estoque_app
   E2E_DATABASE_URL=postgresql+psycopg://estoque:senha-do-dono@localhost:5432/estoque_e2e
   E2E_APP_DATABASE_URL=postgresql+psycopg://estoque_app:senha-da-aplicacao@localhost:5432/estoque_e2e
   ```
   As permissões do usuário da aplicação nas tabelas são concedidas pelas próprias migrations, a partir da `APP_DB_ROLE`. O teste de ponta a ponta também usa as portas 8001 e 5175, que precisam estar livres.

8. **Rodar os testes:** `pytest` (dentro de `backend`), `npm run test` e `npm run test:e2e` (dentro de `frontend`).

## Limitações conhecidas

- **Ambiente de demonstração.** O site público roda em planos gratuitos e recria os dados de exemplo uma vez por dia, por isso é uma demonstração, não um ambiente de produção.
- **Partida a frio.** Como a API gratuita hiberna e o banco do Neon suspende sem uso, o primeiro acesso depois de um período ocioso pode levar até um minuto.
- **Uma única instância da API.** Os limites de tentativas (login, troca de senha e alterações da conta de demonstração) são contados na memória do processo, por isso a API roda com 1 processo. Para escalar, a contagem precisaria ir para um armazenamento compartilhado, como o Redis.
- **CNPJ apenas numérico.** O cadastro de fornecedor aceita o CNPJ só com 14 dígitos numéricos. O novo formato alfanumérico da Receita (em uso desde 31/07/2026) ainda não é aceito.

## Como foi desenvolvido

O projeto foi conduzido com o engenheiro definindo a arquitetura, as regras de negócio e as decisões técnicas, e o Claude Code atuando como operador que implementa cada fase sob essas decisões. O repositório traz um `CLAUDE.md` com as regras de trabalho, *skills* que padronizam tarefas recorrentes (criar endpoint, criar migration, montar página do frontend, aplicar as regras de negócio) e agentes de revisão acionados ao longo do caminho:

- **code-reviewer** — revisa o código FastAPI recém-escrito contra as regras e os casos de teste;
- **security-auditor** — audita rotas desprotegidas, segredos, JWT e validação de entrada;
- **ui-reviewer** — revisa as telas do frontend em várias larguras (responsividade, contraste, foco, estados de carregando/erro/vazio).

A identidade visual foi definida e revisada com as *skills* Impeccable e UI/UX Pro Max, e cada mudança de tela passou pelo **ui-reviewer**.

## Documentação

- [Regras de negócio](docs/regras-negocio.md)
- [Casos de teste](docs/casos-de-teste.md)
- [Modelo de dados](docs/modelo-de-dados.md)
- [Guia de deploy](docs/deploy.md)
- [Design system (DESIGN.md)](DESIGN.md)
- [Produto (PRODUCT.md)](PRODUCT.md)

## Autor

**Kaiky Jefferson Fernandes Lima** — [GitHub](https://github.com/kaikyjefferson0)

## Licença

Distribuído sob a licença MIT. Veja o arquivo [LICENSE](LICENSE).
