# Deploy no Render

Este guia coloca o Estoque Inteligente no ar no [Render](https://render.com), no plano gratuito, usando o **Blueprint** (`render.yaml`, na raiz do repositório). O Blueprint é uma "receita": você aponta o Render para o repositório e ele cria tudo sozinho.

## O que o Blueprint cria

| Serviço | Tipo | O que é |
|---|---|---|
| `estoque-db` | Postgres (free, Virginia) | O banco de dados. Só os serviços do próprio Render conseguem acessá-lo (`ipAllowList: []`). |
| `estoque-api` | Web service Python (free, Virginia) | A API FastAPI. Ao subir, roda `alembic upgrade head` e depois o `uvicorn` com 1 processo. O Render confere se ela está viva em `/health`. |
| `estoque-site` | Static site | O site React. O Render roda `npm ci` e `npm run build` e publica a pasta `dist`. Static site não tem plano nem região: é sempre gratuito e servido por uma CDN. |

O sistema roda em **modo de demonstração** (`DEMO_MODE=true`): a cada subida da API, se a última recriação foi há mais de 24 horas, **o banco inteiro é apagado e recriado** com os dados de exemplo (RN-54). Por isso esse banco é só da demonstração: não guarde nada de verdade nele.

## Antes de começar

1. O código precisa estar no GitHub, com o `render.yaml` na branch `main`.
2. Crie uma conta no Render (dá para entrar com o GitHub) e autorize o acesso ao repositório.
3. Decida as senhas do admin e da conta demo (veja a tabela abaixo). Guarde a do admin num gerenciador de senhas.

## Criar o Blueprint

1. No painel do Render, clique em **New +** → **Blueprint**.
2. Escolha o repositório `estoque-inteligente` e a branch `main`. O Render encontra o `render.yaml` sozinho.
3. Dê um nome ao Blueprint (ex.: `estoque-inteligente`).
4. O Render mostra os três serviços e pede as variáveis marcadas com `sync: false`. Preencha todas (lista abaixo).
5. Clique em **Apply** (ou **Deploy Blueprint**). O banco é criado primeiro, depois a API e o site.

### Variáveis que você preenche no painel

Nenhum valor fica no git. As outras variáveis já vêm do `render.yaml`: a URL do banco, a `SECRET_KEY` (o Render gera uma chave aleatória), `APP_ENV`, `TRUST_PROXY_HEADERS`, `DEMO_MODE`, `PYTHON_VERSION`, `NODE_VERSION` e `VITE_DEMO`.

Os endereços públicos (`CORS_ORIGINS` e `VITE_API_URL`) também são preenchidos aqui, e não saem do nome dos serviços. Veja "Endereços com sufixo e o risco de apontar para outra pessoa", abaixo.

**API (`estoque-api`)**

| Variável | Para que serve |
|---|---|
| `ADMIN_EMAIL` | E-mail do admin do dono do sistema, recriado a cada recriação da demo. Não pode ser `revisor-ui@estoque.local` nem igual ao `DEMO_EMAIL`. |
| `ADMIN_PASSWORD` | Senha desse admin (8 a 128 caracteres). **Secreta**: só você sabe. |
| `DEMO_EMAIL` | E-mail da conta de demonstração (operador), usada pelos visitantes. É pública (vai no README e no botão do login). |
| `DEMO_PASSWORD` | Senha da conta de demonstração (8 a 128 caracteres). Também é pública, então não reaproveite uma senha sua. |
| `CORS_ORIGINS` | Endereço público **real** do site, com `https://` e sem barra no final (hoje `https://estoque-site-4qap.onrender.com`). É a única origem que a API aceita. |

**Site (`estoque-site`)**

| Variável | Para que serve |
|---|---|
| `VITE_API_URL` | Endereço público **real** da API, com `https://` e sem barra no final (hoje `https://estoque-api-pqbo.onrender.com`). É para onde o site manda o login e todas as chamadas. |
| `VITE_DEMO_EMAIL` | E-mail que o botão "Entrar como demonstração" usa. Precisa ser **igual** ao `DEMO_EMAIL` da API. |
| `VITE_DEMO_SENHA` | Senha que esse botão usa. Precisa ser **igual** ao `DEMO_PASSWORD` da API. Sem as duas, o botão não aparece. |

As variáveis `VITE_` entram no site **na hora do build**. Se mudar alguma, faça um novo deploy do site (**Manual Deploy** → **Deploy latest commit**).

### Endereços com sufixo e o risco de apontar para outra pessoa

O endereço público de um serviço do Render vem do nome dele (`estoque-api` → `estoque-api.onrender.com`). Esses endereços são **globais**: se o nome já é de outra conta, o Render acrescenta um sufixo aleatório ao nosso. Foi o que aconteceu aqui:

| Serviço | Endereço atual |
|---|---|
| Site (`estoque-site`) | `https://estoque-site-4qap.onrender.com` |
| API (`estoque-api`) | `https://estoque-api-pqbo.onrender.com` |

O endereço sem sufixo (`estoque-api.onrender.com`) existe, mas **é de outra pessoa**. No primeiro deploy, o `VITE_API_URL` foi escrito no `render.yaml` a partir do nome do serviço. Com isso, o nosso site mandava o login (e-mail e senha digitados) para a API dessa outra conta. Por isso:

- **`VITE_API_URL` e `CORS_ORIGINS` não ficam no `render.yaml`.** Eles são `sync: false`: o Render pede o valor na criação do Blueprint, e as sincronizações seguintes não mexem nele.
- **O endereço real** aparece no topo da página de cada serviço no painel. Copie de lá, com `https://` e sem barra no final.
- **Num Blueprint novo** (ex.: outra conta ou serviços recriados), o sufixo pode ser outro. Crie o Blueprint, anote os dois endereços reais e preencha:
  1. na API, `CORS_ORIGINS` com o endereço real do site;
  2. no site, `VITE_API_URL` com o endereço real da API. Como ele entra no build, faça um novo deploy do site (**Manual Deploy** → **Deploy latest commit**).
- **Depois de cada sincronização do Blueprint**, confira em **Environment** que os dois valores continuam os do painel.

(Um endereço sem `https://` também funciona: a API e o site acrescentam o `https://` sozinhos.)

## Acompanhar os logs

- Clique no serviço (`estoque-api` ou `estoque-site`) → aba **Events** para ver cada deploy e se ele terminou bem (**Deploy live**) ou falhou (**Deploy failed**).
- Aba **Logs**: a saída do build e da execução. Na API, procure por:
  - `Running upgrade ...`: o Alembic aplicando as migrations;
  - `Application startup complete`: a API subiu (inclusive a recriação da demo, que roda antes disso);
  - um `RuntimeError` ou `DemoRecusadaError` logo no início: falta ou está errada alguma variável. A mensagem diz qual, sem mostrar o valor;
  - `DemoOcupadaError`: outra recriação segurou a trava por mais de 60 segundos. Nada foi apagado; o Render sobe a API de novo e ela tenta outra vez;
  - `connection timeout` ou `OperationalError` do psycopg: o banco não respondeu em 10 segundos (`connect_timeout`). Confira se o `estoque-db` está disponível.
- O plano gratuito **dorme depois de 15 minutos sem acesso**. Veja "Primeira visita depois de um tempo parado", abaixo.

## Primeira visita depois de um tempo parado

**A primeira visita depois de um tempo parado pode demorar até um minuto.** A API acorda, roda as migrations e, se a última recriação passou de 24 horas, recria a demo. Só depois disso ela abre a porta. Enquanto isso, o proxy do Render responde **503** (uma página HTML do Render, não o JSON da API).

O site já trata isso no login. Quando a API responde 503 ou não responde, ele mostra "A API está acordando, isso pode levar até um minuto" e tenta de novo sozinho, com esperas crescentes (2, 4, 8, 16 e 30 segundos). Só mostra erro se a API não acordar depois disso. A conferência da sessão salva, ao recarregar a página, também espera, sem aviso. As outras chamadas não se repetem: um envio de estoque nunca é reenviado às cegas.

Para saber de onde veio um 503, olhe o cabeçalho `x-render-routing` da resposta (no navegador: DevTools → Network → a requisição → Response Headers):
- `suspend-by-user`: o serviço foi suspenso no painel. Clique em **Resume Service**;
- qualquer outro valor, com corpo HTML: a API ainda está acordando ou caiu. Confira os **Logs**;
- a própria API nunca responde 503.

## O que conferir depois do deploy

Os endereços abaixo são os atuais (veja "Endereços com sufixo"); num Blueprint novo, troque pelos reais. Os comandos funcionam no `cmd` do Windows (o `curl` já vem instalado).

1. **Health**: `curl https://estoque-api-pqbo.onrender.com/health` deve responder `{"status":"ok"}`.
2. **Para onde o site chama (Request URL)**: é a conferência mais importante depois de cada deploy do site, porque um `VITE_API_URL` errado manda o login digitado para outro servidor sem nenhum erro aparente.
   1. Abra `https://estoque-site-4qap.onrender.com` e as ferramentas do navegador (**F12**) → aba **Network** (Rede).
   2. Entre com qualquer e-mail e senha errados (não use uma senha de verdade nesta conferência).
   3. Clique na requisição `login` → aba **Headers** (Cabeçalhos) → **Request URL**. Ela precisa ser exatamente `https://estoque-api-pqbo.onrender.com/auth/login`. Se aparecer outro endereço (por exemplo, `estoque-api.onrender.com`, sem o sufixo), corrija o `VITE_API_URL` no painel do site e faça um novo deploy dele.
   4. A resposta deve ser **401** com o JSON da API ("E-mail ou senha incorretos"), e não um erro de CORS no console. Um erro de CORS indica que o `CORS_ORIGINS` da API não é o endereço real do site.
3. **Login demo**: abra `https://estoque-site-4qap.onrender.com`, clique em **Entrar como demonstração** e confira se o painel aparece com os produtos de exemplo. Tente trocar a senha da conta demo: deve ser recusado (RN-53).
4. **/docs desligado**: `https://estoque-api-pqbo.onrender.com/docs`, `/redoc` e `/openapi.json` devem responder **404** (em produção a documentação interativa fica desligada).
5. **Cabeçalhos de segurança**:
   - `curl -I https://estoque-api-pqbo.onrender.com/health`
   - `curl -I https://estoque-site-4qap.onrender.com`

   As duas respostas devem ter `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` e `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
6. **IP do visitante (limite de login, RN-47)**: o limite precisa contar o IP de cada visitante, e não o IP do proxy do Render. Com `TRUST_PROXY_HEADERS=true`, a API lê o `True-Client-Ip` e, na falta dele, o `Cf-Connecting-Ip`. A Cloudflare, que fica na frente do Render, define esses dois cabeçalhos e substitui o que o cliente mandar. O `X-Forwarded-For` **não** é usado: o Render não limpa o valor enviado pelo cliente, só acrescenta o IP real no fim, e um cabeçalho falsificado daria tentativas novas a cada requisição. Errar a senha do admin 11 vezes no mesmo minuto deve dar (o limite é de 10 tentativas por minuto por IP) "Muitas tentativas" (429) para você. Logo depois, de outra rede (ex.: o 4G do celular, sem Wi-Fi), o login com a conta demo precisa continuar funcionando. Se o celular também receber 429, o `TRUST_PROXY_HEADERS` não está valendo: confira a variável e os logs.
7. **Sem o revisor-ui**: entre como admin (`ADMIN_EMAIL`) e abra **Usuários**. Devem existir só duas contas: o admin e a conta demo (operador). O `revisor-ui@estoque.local` nunca pode aparecer: ele existe só no banco de desenvolvimento (RN-55), e nenhum script do deploy o cria.

## Recriar a demo na hora

A recriação acontece sozinha quando a API sobe e a última foi há mais de 24 horas (inclusive quando ela acorda depois de dormir). Para recriar antes disso, use o comando manual `py -m app.scripts.reset_demo` no seu computador. Como o banco não aceita conexões de fora (`ipAllowList: []`):

1. Libere temporariamente o seu IP em `estoque-db` → **Networking** → **Access Control**.
2. No `cmd`, dentro de `backend`, defina **só nessa janela** (nunca no `.env` do projeto) `DEMO_MODE=true`, `DATABASE_URL` e `MIGRATIONS_DATABASE_URL` com a **External Database URL** do banco (aba **Info** do `estoque-db`), além de `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_EMAIL` e `DEMO_PASSWORD` iguais aos do painel. O `backend\.env` local também é lido e preenche o que faltar; se ele tiver `APP_DB_ROLE`, zere-a nessa janela com `set "APP_DB_ROLE= "` (com o espaço), porque no Render não existe usuário da aplicação. Depois rode `py -m app.scripts.reset_demo`.
3. Remova a liberação do IP e feche a janela do `cmd`.

## Limitações do plano gratuito

- O banco Postgres gratuito **expira 30 dias** depois de criado (o Render avisa por e-mail). O atual foi criado em 29/10/2026 e expira em 28/11/2026; o passo a passo para recriar está em `docs\pendencias.md`.
- A API dorme sem acesso, e a primeira visita depois disso pode demorar até um minuto (veja "Primeira visita depois de um tempo parado", acima).
- Há um usuário só no banco (o dono). A separação entre dono e usuário da aplicação (RN-50, `APP_DB_ROLE`) fica para depois.
