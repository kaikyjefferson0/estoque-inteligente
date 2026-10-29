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

Nenhum valor fica no git. As outras variáveis já vêm do `render.yaml`: a URL do banco, a `SECRET_KEY` (o Render gera uma chave aleatória), `APP_ENV`, `TRUST_PROXY_HEADERS`, `DEMO_MODE`, `PYTHON_VERSION`, `CORS_ORIGINS`, `NODE_VERSION`, `VITE_API_URL` e `VITE_DEMO`.

**API (`estoque-api`)**

| Variável | Para que serve |
|---|---|
| `ADMIN_EMAIL` | E-mail do admin do dono do sistema, recriado a cada recriação da demo. Não pode ser `revisor-ui@estoque.local` nem igual ao `DEMO_EMAIL`. |
| `ADMIN_PASSWORD` | Senha desse admin (8 a 128 caracteres). **Secreta**: só você sabe. |
| `DEMO_EMAIL` | E-mail da conta de demonstração (operador), usada pelos visitantes. É pública (vai no README e no botão do login). |
| `DEMO_PASSWORD` | Senha da conta de demonstração (8 a 128 caracteres). Também é pública, então não reaproveite uma senha sua. |

**Site (`estoque-site`)**

| Variável | Para que serve |
|---|---|
| `VITE_DEMO_EMAIL` | E-mail que o botão "Entrar como demonstração" usa. Precisa ser **igual** ao `DEMO_EMAIL` da API. |
| `VITE_DEMO_SENHA` | Senha que esse botão usa. Precisa ser **igual** ao `DEMO_PASSWORD` da API. Sem as duas, o botão não aparece. |

As variáveis `VITE_` entram no site **na hora do build**. Se mudar alguma, faça um novo deploy do site (**Manual Deploy** → **Deploy latest commit**).

### Se o Render der outro endereço aos serviços

O `render.yaml` supõe os endereços `https://estoque-api.onrender.com` e `https://estoque-site.onrender.com`. Se um desses nomes já estiver em uso por outra pessoa, o Render acrescenta um sufixo (ex.: `estoque-api-x1y2.onrender.com`). O endereço real aparece no topo da página de cada serviço. Se for diferente:

1. Na API, em **Environment**, troque `CORS_ORIGINS` pelo endereço real do site (com `https://`, sem barra no final).
2. No site, em **Environment**, troque `VITE_API_URL` pelo endereço real da API e faça um novo deploy do site.
3. Corrija também os dois valores no `render.yaml` e faça commit, para o arquivo continuar igual ao que está no ar.

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

Use o endereço real de cada serviço. Os comandos abaixo funcionam no `cmd` do Windows (o `curl` já vem instalado).

1. **Health**: `curl https://estoque-api.onrender.com/health` deve responder `{"status":"ok"}`.
2. **Login demo**: abra `https://estoque-site.onrender.com`, clique em **Entrar como demonstração** e confira se o painel aparece com os produtos de exemplo. Tente trocar a senha da conta demo: deve ser recusado (RN-53).
3. **/docs desligado**: `https://estoque-api.onrender.com/docs`, `/redoc` e `/openapi.json` devem responder **404** (em produção a documentação interativa fica desligada).
4. **Cabeçalhos de segurança**:
   - `curl -I https://estoque-api.onrender.com/health`
   - `curl -I https://estoque-site.onrender.com`

   As duas respostas devem ter `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` e `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
5. **X-Forwarded-For (limite de login, RN-47)**: o limite precisa contar o IP de cada visitante, e não o IP do proxy do Render. Errar a senha do admin 11 vezes no mesmo minuto deve dar (o limite é de 10 tentativas por minuto por IP) "Muitas tentativas" (429) para você. Logo depois, de outra rede (ex.: o 4G do celular, sem Wi-Fi), o login com a conta demo precisa continuar funcionando. Se o celular também receber 429, o `TRUST_PROXY_HEADERS` não está valendo: confira a variável e os logs.
6. **Sem o revisor-ui**: entre como admin (`ADMIN_EMAIL`) e abra **Usuários**. Devem existir só duas contas: o admin e a conta demo (operador). O `revisor-ui@estoque.local` nunca pode aparecer: ele existe só no banco de desenvolvimento (RN-55), e nenhum script do deploy o cria.

## Recriar a demo na hora

A recriação acontece sozinha quando a API sobe e a última foi há mais de 24 horas (inclusive quando ela acorda depois de dormir). Para recriar antes disso, use o comando manual `py -m app.scripts.reset_demo` no seu computador. Como o banco não aceita conexões de fora (`ipAllowList: []`):

1. Libere temporariamente o seu IP em `estoque-db` → **Networking** → **Access Control**.
2. No `cmd`, dentro de `backend`, defina **só nessa janela** (nunca no `.env` do projeto) `DEMO_MODE=true`, `DATABASE_URL` e `MIGRATIONS_DATABASE_URL` com a **External Database URL** do banco (aba **Info** do `estoque-db`), além de `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_EMAIL` e `DEMO_PASSWORD` iguais aos do painel. O `backend\.env` local também é lido e preenche o que faltar; se ele tiver `APP_DB_ROLE`, zere-a nessa janela com `set "APP_DB_ROLE= "` (com o espaço), porque no Render não existe usuário da aplicação. Depois rode `py -m app.scripts.reset_demo`.
3. Remova a liberação do IP e feche a janela do `cmd`.

## Limitações do plano gratuito

- O banco Postgres gratuito **expira 30 dias** depois de criado (o Render avisa por e-mail). Antes disso, crie um banco novo pelo painel e atualize o Blueprint, ou passe para um plano pago.
- A API dorme sem acesso, e a primeira visita depois disso pode demorar até um minuto (veja "Primeira visita depois de um tempo parado", acima).
- Há um usuário só no banco (o dono). A separação entre dono e usuário da aplicação (RN-50, `APP_DB_ROLE`) fica para depois.
