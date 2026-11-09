Estoque Inteligente

CI

Sistema web de controle de estoque com lotes e validade, alertas automáticos e dashboard.

Destaques
FEFO: a saída usa primeiro o lote que vence primeiro, e o saldo nunca fica negativo.
Alertas automáticos: estoque baixo, vencimento próximo e vencido, sem repetição.
Dashboard: a situação do estoque, calculada a cada acesso.
Segurança: login com JWT, senhas com Argon2, perfis admin e operador, e limite de tentativas de login.
Histórico imutável: nenhuma movimentação pode ser alterada ou apagada, nem pelo próprio sistema.
Qualidade: 295 testes automatizados, entre backend, frontend e ponta a ponta.
Teste agora

Site: https://estoque-site-4qap.onrender.com

Entre com a conta de demonstração (perfil operador):

E-mail: demo@estoque-inteligente.com
Senha: Demo-Estoque-2026

O primeiro acesso pode levar até um minuto: no plano gratuito do Render, a API "dorme" quando fica ociosa e precisa acordar. As telas mostram um estado de carregando enquanto isso. Os dados de demonstração são recriados do zero uma vez por dia.

Capturas de tela
Painel	Estoque
Painel	Estoque
Detalhe do produto (lotes e histórico)	Entrada pelo código de barras
Detalhe do produto	Entrada
Alertas	Usuários
Alertas	Usuários

No celular (390 px):

Painel	Alertas
Painel no celular	Alertas no celular
Tecnologias
Backend: Python, FastAPI, Uvicorn, SQLAlchemy, Alembic, Psycopg 3, PostgreSQL.
Segurança: Argon2 para o hash de senha e JWT para autenticação.
Frontend: React, TypeScript e CSS, com Vite.
Testes: pytest (backend), Vitest (unidade do frontend) e Playwright (ponta a ponta).
Infraestrutura: Docker e Docker Compose (ambiente local completo) e GitHub Actions (CI com os três tipos de teste a cada push e pull request).
Deploy: API e site no Render (plano gratuito, com a Cloudflare à frente) e banco PostgreSQL no Neon.
Arquitetura e decisões técnicas

Camadas no backend. O código é separado por responsabilidade: routers só cuidam do HTTP (recebem a requisição e devolvem a resposta), services concentram as regras de negócio e as transações, models descrevem as tabelas (SQLAlchemy) e schemas validam entrada e saída (Pydantic). Nenhuma regra de negócio mora no router.

As regras também no banco. Além das validações da aplicação, o PostgreSQL garante as invariantes com constraints e triggers: o histórico de movimentações não aceita UPDATE nem DELETE, os saldos não ficam negativos e as relações entre produto, lote e movimentação são protegidas. Assim as regras valem mesmo diante de um acesso fora da API.

Menor privilégio no banco. A aplicação pode rodar com dois usuários: o dono aplica as migrations (DDL) e um usuário da aplicação só tem o necessário para ler e gravar dados, sem poder alterar a estrutura. Isso limita o estrago de uma eventual falha na API. As permissões do usuário da aplicação são sincronizadas e verificadas a cada deploy e, se estiverem erradas, a API não sobe.

Concorrência. Entradas, saídas e ajustes simultâneos sobre o mesmo produto são serializados com travas de linha (FOR NO KEY UPDATE) numa ordem fixa de aquisição, evitando deadlocks e condições de corrida no saldo. Há testes com duas conexões reais cobrindo esses cenários.

Limite de login com o IP real. O login aceita no máximo 10 tentativas por minuto por IP. Atrás do proxy do Render (com a Cloudflare à frente), o IP vem do cabeçalho True-Client-Ip (ou Cf-Connecting-Ip), definidos pela Cloudflare. O X-Forwarded-For é deliberadamente ignorado, porque o proxy apenas acrescenta itens ao que o cliente enviou e ele poderia ser falsificado para ganhar tentativas novas.

Partida a frio. No plano gratuito, a API hiberna quando fica ociosa, e o Neon também suspende o banco sem uso. O frontend trata a primeira resposta lenta com tolerância e estado de carregando, e há um teste específico para esse comportamento.

Modo de demonstração. Com DEMO_MODE ligado, a API recria todo o banco com dados de exemplo pelas próprias regras (FEFO, lotes, alertas e histórico) uma vez por dia, e a conta de demonstração tem a troca de senha bloqueada. É o que mantém o site público sempre com dados coerentes e sem acúmulo.

Qualidade

Os números abaixo refletem a suíte atual do projeto:

Backend — pytest: 235 testes. Cobrem as regras de negócio (cada caso de teste CT-xx da documentação vira um teste), os services e as rotas, autenticação e perfis, segurança HTTP e CORS, paginação, concorrência com conexões reais, permissões do banco, partida a frio e o modo de demonstração.
Frontend — Vitest: 50 testes. Cobrem o cliente de API, a formatação e o fuso das datas (rodam com o computador no fuso de Tóquio para provar que as datas seguem America/Sao_Paulo), a paginação e a página de demonstração.
Ponta a ponta — Playwright: 10 testes. Rodam contra a API e um banco reais (recriado a cada execução), seguindo fluxos completos de cadastro, entrada, saída, ajuste e alertas, além da responsividade das telas.
Rodando com Docker

Pré-requisito: Docker com o Compose (no Windows, o Docker Desktop aberto). Na raiz do projeto:

docker compose up --build -d

Pronto: o comando sobe o PostgreSQL 18, a API e o site, sem precisar de .env. Ao subir, a API cria as tabelas pelas migrations, os dados de exemplo e as contas abaixo.

Site: http://localhost:8080 (o botão "Entrar como demonstração" entra direto)
API: http://localhost:8000 (documentação em http://localhost:8000/docs)
Conta local	E-mail	Senha
Operador de demonstração	demo@exemplo.com.br	demo-local-docker
Admin	admin@exemplo.com.br	admin-local-docker

Comandos úteis:

docker compose logs -f api                               (acompanhar os logs da API)
docker compose down                                      (parar, mantendo os dados)
docker compose down -v                                   (parar e apagar os dados)
docker compose exec api python -m app.scripts.reset_demo (recriar os dados de exemplo na hora)

Bom saber:

Os dados locais são de demonstração. O ambiente roda com DEMO_MODE=true: os dados ficam no volume entre um down e um up, mas a API apaga e recria tudo ao subir se a última recriação passou de 24 horas (RN-54). Os limites da demonstração (RN-56 e RN-57) também valem aqui.
Só para uso local. As senhas e a SECRET_KEY padrão são públicas, por isso as portas só abrem em 127.0.0.1 e o banco não tem porta publicada (não conflita com um PostgreSQL instalado na 5432).
Isolado de outros bancos. O Compose não lê o backend\.env e as URLs do banco apontam sempre para o contêiner db.
Para mudar portas, contas ou senhas, copie o .env.example da raiz para .env e preencha só o que quiser (veja as instruções no arquivo). Se a porta 8000 ou 8080 estiver ocupada, é só definir API_PORT ou SITE_PORT.

O deploy em produção não usa estes arquivos: veja o guia de deploy.

Como rodar localmente (Windows)

Pré-requisitos: Python 3.14, Node.js 24 e PostgreSQL instalados.

Banco de dados. Crie um banco no PostgreSQL (por exemplo, estoque_inteligente).
Backend — ambiente e dependências (dentro de backend):
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt -r requirements-dev.txt
Variáveis de ambiente. Copie backend\.env.example para backend\.env e preencha os valores reais (pelo menos DATABASE_URL e SECRET_KEY; gere a chave com py -c "import secrets; print(secrets.token_hex(32))").
Migrations e primeiro admin (dentro de backend, com o ambiente ativo):
   alembic upgrade head
   py -m app.scripts.create_admin
Rodar a API (dentro de backend):
   uvicorn app.main:app --reload
Frontend (dentro de frontend):
   npm install

Crie um arquivo .env com VITE_API_URL=http://localhost:8000 e rode:

   npm run dev

O site abre em http://localhost:5173.

Bancos dos testes. Os testes automatizados nunca usam o banco de desenvolvimento: eles apagam e recriam o banco a cada execução, por isso cada um tem uma trava que recusa rodar se o nome do banco não terminar no sufixo esperado. Os valores de exemplo de todas as variáveis abaixo estão em backend\.env.example.
pytest: precisa de um banco com nome terminado em _test, configurado em TEST_DATABASE_URL com o usuário dono do banco (as migrations rodam nele). Sem essa variável, ou com outro nome de banco, o pytest para antes de começar.
npm run test:e2e: precisa do banco estoque_e2e, de um usuário da aplicação separado do dono e de três variáveis: E2E_DATABASE_URL (o dono), E2E_APP_DATABASE_URL (o usuário da aplicação, no mesmo banco) e APP_DB_ROLE (o nome desse usuário). O teste sobe a API com o usuário da aplicação, como em produção.
Opcional: TEST_APP_DATABASE_URL (o banco _test com o usuário da aplicação) liga os testes de permissão do banco; sem ela, esses testes são pulados.
Para criar os bancos, no psql como postgres (troque as senhas):
sql
   CREATE ROLE estoque LOGIN PASSWORD 'senha-do-dono';
   CREATE ROLE estoque_app LOGIN PASSWORD 'senha-da-aplicacao';
   CREATE DATABASE estoque_inteligente_test OWNER estoque;
   CREATE DATABASE estoque_e2e OWNER estoque;
   GRANT CONNECT ON DATABASE estoque_inteligente_test TO estoque_app;
   GRANT CONNECT ON DATABASE estoque_e2e TO estoque_app;

E no backend\.env:

   TEST_DATABASE_URL=postgresql+psycopg://estoque:senha-do-dono@localhost:5432/estoque_inteligente_test
   TEST_APP_DATABASE_URL=postgresql+psycopg://estoque_app:senha-da-aplicacao@localhost:5432/estoque_inteligente_test
   APP_DB_ROLE=estoque_app
   E2E_DATABASE_URL=postgresql+psycopg://estoque:senha-do-dono@localhost:5432/estoque_e2e
   E2E_APP_DATABASE_URL=postgresql+psycopg://estoque_app:senha-da-aplicacao@localhost:5432/estoque_e2e

As permissões do usuário da aplicação nas tabelas são concedidas pelas próprias migrations, a partir da APP_DB_ROLE. O teste de ponta a ponta também usa as portas 8001 e 5175, que precisam estar livres.

Rodar os testes: pytest (dentro de backend), npm run test e npm run test:e2e (dentro de frontend).
Limitações conhecidas
Ambiente de demonstração. O site público roda em planos gratuitos e recria os dados de exemplo uma vez por dia, por isso é uma demonstração, não um ambiente de produção.
Partida a frio. Como a API gratuita hiberna e o banco do Neon suspende sem uso, o primeiro acesso depois de um período ocioso pode levar até um minuto.
Uma única instância da API. Os limites de tentativas (login, troca de senha e alterações da conta de demonstração) são contados na memória do processo, por isso a API roda com 1 processo. Para escalar, a contagem precisaria ir para um armazenamento compartilhado, como o Redis.
CNPJ apenas numérico. O cadastro de fornecedor aceita o CNPJ só com 14 dígitos numéricos. O novo formato alfanumérico da Receita (em uso desde 31/07/2026) ainda não é aceito.
Como foi desenvolvido

O projeto foi conduzido com o engenheiro definindo a arquitetura, as regras de negócio e as decisões técnicas, e o Claude Code atuando como operador que implementa cada fase sob essas decisões. O repositório traz um CLAUDE.md com as regras de trabalho, skills que padronizam tarefas recorrentes (criar endpoint, criar migration, montar página do frontend, aplicar as regras de negócio) e agentes de revisão acionados ao longo do caminho:

code-reviewer — revisa o código FastAPI recém-escrito contra as regras e os casos de teste;
security-auditor — audita rotas desprotegidas, segredos, JWT e validação de entrada;
ui-reviewer — revisa as telas do frontend em várias larguras (responsividade, contraste, foco, estados de carregando/erro/vazio).
Documentação
Regras de negócio
Casos de teste
Modelo de dados
Guia de deploy
Autor

Kaiky Jefferson Fernandes Lima — GitHub

Licença

Distribuído sob a licença MIT. Veja o arquivo LICENSE.