# Auditoria: requisitos do professor (GQS e Banco de Dados)

Auditoria **somente leitura**, feita em 23/11/2026 na branch `feat/excluir-fornecedor` (commit `107f23a`, com
mudanças não commitadas em `PRODUCT.md`, `docs/casos-de-teste.md` e `docs/regras-negocio.md`, mais a pasta `db/`
fora do git). Referência: repositório modelo `petrosbarreto/projeto-modelo-crud-2026` (`INTENSIVO.md`,
`docs/PASSO-A-PASSO.md`, `docs/CYPRESS.md`, `.github/workflows/ci.yml`, `db/seed.sql`), lido nesta auditoria.
Acordos com o professor: Playwright no lugar de Cypress, PostgreSQL no lugar de MySQL, Swagger visível e DELETE de verdade.

Nenhum código, migration, teste, config ou requirements foi alterado. O `pytest-cov` foi instalado **só no venv
local** (`backend\.venv`, com `uv pip install`), e o `.coverage` gerado pela medição foi apagado.

---

## 1. Resumo

1. O **banco já cumpre quase tudo**: 7 tabelas com PK, 8 FKs (todas `ON DELETE RESTRICT`), vários UNIQUE e CHECK com sentido de negócio, JOIN e GROUP BY usados pela aplicação e nenhum SQL montado com dado do usuário. Faltam **uma coluna em DECIMAL** (não existe valor monetário) e **versionar a pasta `db/`**.
2. O **CRUD está incompleto**: produto e fornecedor só têm C, R e U (PATCH). Não existe nenhuma rota DELETE ou PUT. A RN-59 (excluir fornecedor) já está escrita, mas não foi implementada. Excluir produto esbarra na RN-39: **todo produto nasce com um alerta** de estoque baixo.
3. **Backend: 272 testes, todos verdes, cobertura de 96%.** Só que 221 usam banco. Os 51 sem banco são de configuração e segurança, não de uma regra de estoque. Faltam testes unitários puros de uma regra de negócio com valor-limite, e falta o `pytest-cov` no requirements e no CI.
4. O **E2E (Playwright) não atende o professor**: o banco é recriado por arquivo, não por teste (os testes formam uma história em série), não há nenhum `data-cy`, e o CRUD testado é só C e R.
5. **Swagger, CI, README e Docker** estão bem encaminhados. Porém o `/docs` fica **desligado no Render por decisão de código**, o CI não mede cobertura e o README não tem comandos separados para integração, cobertura e scripts SQL. O `docker compose up` já sobe tudo.

---

## 2. Requisitos

| Req. | Requisito | Status | Evidência (caminho:linha) | O que falta |
|---|---|---|---|---|
| (a) | ≥2 tabelas com FK 1:N | **CUMPRE** | `backend/app/models/product.py:39` (suppliers 1:N products), `batch.py:29` (products 1:N batches), `stock_movement.py:33-53`, `alert.py:34-57` | — |
| (b) | PK em todas | **CUMPRE** | 7 tabelas com `id serial`, PK `<tabela>_pkey` (`db/postgres/01-schema.sql:17-19`) | — (os nomes são o padrão do Postgres, não `pk_`; decisão já tomada) |
| (c) | ≥1 UNIQUE e ≥1 CHECK de negócio | **CUMPRE** | `supplier.py:15` (`uq_suppliers_cnpj`), `product.py:32` (`ix_products_codigo_barras`), `product.py:13` (`ck_products_estoque_minimo_nao_negativo`), `supplier.py:13`, `ck_batches_quantidade_nao_negativa`, `ck_stock_movements_*` | — |
| (d) | Tipo certo; dinheiro em DECIMAL | **PARCIAL** | Tipos corretos (integer, date, timestamptz, varchar com limite, boolean). Não há nenhum `Numeric`, `Float` ou valor monetário em `.py`, `.sql` ou `docs/` | Criar uma coluna monetária em `NUMERIC` por migration (seção 4) |
| (e) | CREATE TABLE e seed (com DELETE) versionados | **PARCIAL** | `db/postgres/01-schema.sql`, `db/seed.sql:46-56` (começa com DELETE), `db/README.md` | **A pasta `db/` está fora do git** (`?? db/`) e não aparece no README |
| (f) | ≥1 JOIN e ≥1 GROUP BY usados pela app | **CUMPRE** | `services/condicoes.py:85-102` (`products LEFT JOIN batches GROUP BY products.id`), usada em GET `/stock`, `/dashboard` e `/products/{id}/stock`; `services/dashboard.py:40-48` (JOIN de 4 tabelas) | Para a apresentação: mostrar o SQL gerado pelo ORM |
| (g) | SQL sempre parametrizado | **CUMPRE** | Buscas com `ilike` + bind + escape (`services/paginacao.py:20-23`). As f-strings só têm constantes ou identificadores com `quote` (`core/permissoes.py:117-119`) | — |
| (h) | API Python ligada ao banco | **CUMPRE** | FastAPI + SQLAlchemy + psycopg (`backend/app/main.py`, `core/database.py`) | — |
| (i) | C, R, U e D de uma entidade | **PARCIAL** | Produto: `routers/products.py:18,27,52,60` (GET, POST, GET/{id}, PATCH). Fornecedor: `routers/suppliers.py:18,27,39,47` | **D** (DELETE) em pelo menos uma entidade. A RN-59 já descreve a de fornecedor |
| (j) | 201 / 204 / 404 / 409 / 422 | **PARCIAL** | 201 `products.py:27`, `suppliers.py:27`; 404 `products.py:57`; 409 `products.py:36`; 422 `products.py:32` + Pydantic; 204 só em `auth.py:51` e `users.py:53` | **204 ao excluir** e 409 vindo de FK (fornecedor com produtos) |
| (k) | Tela web com o CRUD inteiro | **PARCIAL** | Criar e editar em `ProdutoFormPage.tsx:162-170` e `FornecedorFormPage.tsx:52-59`; listas em `ProdutosPage.tsx`, `FornecedoresPage.tsx` | Botão **Excluir** com confirmação (`ConfirmarDialogo.tsx` serve) |
| (l) | ≥5 unitários pytest sem banco, regra de negócio, valor-limite | **PARCIAL** | Há 51 casos sem banco, mas de config e segurança (`test_config.py`, `test_seguranca_http.py`). Os mais próximos de regra: `test_demo.py:203` (24 h: None, 23h59, 24h). As regras de estoque só são testadas com banco (`test_alerts.py:74`, `test_stock.py:660`) | Extrair regras puras (situação do estoque, situação do lote) e testá-las com limites, sem banco |
| (m) | ≥1 integração com banco real | **CUMPRE** | 221 casos com banco; `tests/conftest.py:42-66` recria o banco pelas migrations e desfaz cada teste | Marcador `integracao` (o modelo usa `pytest -m integracao`) |
| (n) | E2E: 4 operações do CRUD + 1 erro | **PARCIAL** | `frontend/e2e/estoque.spec.ts:97` cria fornecedor e produtos (C, R). Erro: `:262` (e-mail repetido, 409). `responsividade.spec.ts` abre o editar, mas não salva | **U** (salvar edição), **D** (excluir) e um erro no próprio CRUD |
| (o) | Seletores `data-cy` | **NÃO CUMPRE** | Nenhum `data-cy` ou `data-testid` em `frontend/src`. Os specs usam role, label, texto e algumas classes CSS (`.codigo-barras__digitos`, `.alertas > li`, `.saida__lote`, `.aviso`) | `testIdAttribute: 'data-cy'` + atributos nas telas (seção 7) |
| (p) | Reset/seed **antes de cada** teste E2E | **NÃO CUMPRE** | O banco é recriado por arquivo (`frontend/e2e/rodar.mjs:175`, `:197`), com `workers: 1` (`playwright.config.ts:15-16`) e `describe.serial` (`estoque.spec.ts:78`) | Rota ou comando de reset + `beforeEach` (seção 7) |
| (q) | README com subir e rodar cada suíte | **PARCIAL** | Docker `README.md:166`, local `:197-231`, testes `:258` (`pytest`, `npm run test`, `npm run test:e2e`) | Comandos de unitários vs integração, cobertura e scripts SQL do `db/` |
| (r) | Bônus: CI a cada push | **CUMPRE** | `.github/workflows/ci.yml:3-6` (push na main + PRs, igual ao modelo); jobs pytest (`:71`), Vitest (`:95`) e E2E (`:165`) | Cobertura no CI; opcionais: lint e build |
| (s) | Bônus: cobertura ≥80% | **PARCIAL** | Medido nesta auditoria: **96%** | `pytest-cov` no `requirements-dev.txt` e `--cov-fail-under=80` no CI |
| (t) | Bônus: `docker compose up` sobe tudo | **CUMPRE** | `docker-compose.yml` (db, api, site); `Dockerfile:28` roda migrations e permissões; funciona sem `.env` | — (ressalva: `DEMO_MODE` fixo em `true`) |
| extra | Swagger visível (acordo) | **PARCIAL** | Ligado em desenvolvimento e no docker (`main.py:39-44`); desligado no Render (`render.yaml:36-37`, `APP_ENV: production`) | Decidir se liga no Render; acrescentar summary, responses e exemplos (seção 6) |

**Requisitos do modelo que não estavam na lista**, segundo o `INTENSIVO.md` e o `PASSO-A-PASSO.md` (apresentação de 10 min, rubrica de 10 pontos):

- Mostrar ao vivo uma restrição sendo violada. Já está pronto em `db/README.md`, seção "Restrições sendo violadas".
- Um teste que prova que a rota de reset **não existe** fora do ambiente de teste.
- Rodar o E2E duas vezes seguidas, com as duas passando.
- Na apresentação: explicar um valor-limite e mostrar um defeito que os testes pegaram.
- Rubrica: Modelagem/SQL 2,5; CRUD/API 2,0; unitários e integração 2,0; **E2E 2,5**; apresentação e README 1,0.

---

## 3. Resultados medidos

| Suíte | Total | Aprovados | Pulados | Falhas | Tempo |
|---|---|---|---|---|---|
| Backend: `pytest -rs` | **272** | **272** | **0** | **0** | 51,3 s |
| Frontend: `npm run test` (Vitest) | 82 (9 arquivos) | 82 | 0 | 0 | 4,3 s |
| E2E: `npm run test:e2e` | 26 (10 + 6 + 10) | não rodado nesta auditoria (sobe API e site; não foi pedido) | — | — | — |

Ambiente: Windows, Python 3.14.8, banco local `_test`. Nenhum teste foi pulado, então a `TEST_APP_DATABASE_URL`
está configurada.

**Classificação dos 272 casos do backend:** **51 sem banco** e **221 com banco**.

**Cobertura** (`pytest --cov=app --cov-report=term-missing`, pytest-cov 7.1.0, coverage 7.17.4): **96% no total**
(1678 linhas, 64 sem cobertura). Os mesmos 272 testes passaram com a cobertura ligada.

| Arquivo abaixo de 80% | Cobertura | Linhas sem cobertura |
|---|---|---|
| `app/scripts/create_admin.py` | 44% | 15-16, 20-21, 26-41, 45 |
| `app/scripts/sincronizar_permissoes.py` | 71% | 28-30, 36-42, 51 |

Os dois são scripts de linha de comando. Entre 80% e 90% está só `app/scripts/reset_demo.py` (86%). Todos os
routers, services, models e schemas têm 90% ou mais. Uma opção é tirar `app/scripts` da medição (`omit`); a outra
é testar o `main()` desses dois scripts.

---

## 4. Banco de dados

### 4.1 Tabelas

Ordem das migrations: `9999e9fb2cd0` → `9ccaaf0b37c5` → `5199c5b10be5` → `018922b5501a` → `2a9392eda790` →
`8b6569e6e529` → `d0d28a846fc7` → `fd9b557d540c` → `5ce5fb9fdbd0` → `5213613b4aa4` → `9a0c1c19b39f` (head).
Models, migrations e `db/postgres/01-schema.sql` batem entre si.

**users** (`models/user.py:9-31`)

| Coluna | Tipo | Nulo | Default |
|---|---|---|---|
| id | serial PK `users_pkey` | não | nextval |
| nome | varchar(120) | não | |
| email | varchar(255) | não | |
| senha_hash | varchar(255) | não | |
| perfil | varchar(20) | não | |
| ativo | boolean | não | true |
| criado_em | timestamptz | não | now() |
| senha_alterada_em | timestamptz | sim | |
| demo | boolean | não | false |

- UNIQUE por índice: `ix_users_email`.
- CHECK: `ck_users_perfil` (`perfil IN ('admin','operador')`), `ck_users_email_minusculo` (`email = lower(email)`) e `ck_users_demo_operador` (`NOT demo OR perfil='operador'`).

**suppliers** (`models/supplier.py:9-22`)

| Coluna | Tipo | Nulo | Default |
|---|---|---|---|
| id | serial PK | não | nextval |
| nome | varchar(120) | não | |
| cnpj | varchar(14) | sim | |
| criado_em | timestamptz | não | now() |

- UNIQUE: `uq_suppliers_cnpj` (aceita vários NULL).
- CHECK: `ck_suppliers_cnpj_14_digitos` (`cnpj ~ '^[0-9]{14}$'`).

**products** (`models/product.py:10-46`)

| Coluna | Tipo | Nulo | Default |
|---|---|---|---|
| id | serial PK | não | nextval |
| nome | varchar(120) | não | |
| codigo_barras | varchar(50) | não | |
| estoque_minimo | integer | não | 0 |
| controla_validade | boolean | não | false |
| dias_alerta_validade | integer | sim | |
| fornecedor_id | integer FK | sim | |
| criado_em | timestamptz | não | now() |

- UNIQUE por índice: `ix_products_codigo_barras`.
- Índice: `ix_products_fornecedor_id`.
- CHECK:
  - `ck_products_estoque_minimo_nao_negativo`
  - `ck_products_dias_alerta_validade` (controla validade ⇔ dias > 0)
  - `ck_products_codigo_barras_sem_espacos` (`9a0c1c19b39f`)
- O `fornecedor_nome` não é coluna: é um `column_property` com subconsulta (`product.py:44-46`).

**batches** (`models/batch.py:9-34`)

| Coluna | Tipo | Nulo | Default |
|---|---|---|---|
| id | serial PK | não | nextval |
| produto_id | integer FK | não | |
| validade | date | sim | |
| quantidade | integer | não | 0 |
| criado_em | timestamptz | não | now() |

- UNIQUE: `uq_batches_produto_id_validade` (`NULLS NOT DISTINCT`) e `uq_batches_id_produto_id` (alvo das FKs compostas).
- CHECK: `ck_batches_quantidade_nao_negativa`.

**stock_movements** (`models/stock_movement.py:9-80`)

| Coluna | Tipo | Nulo | Default |
|---|---|---|---|
| id | serial PK | não | nextval |
| produto_id | integer FK | não | |
| lote_id | integer FK composta | não | |
| tipo | varchar(20) | não | |
| quantidade | integer | não | |
| motivo | varchar(255) | sim | |
| usuario_id | integer FK | não | |
| criado_em | timestamptz | não | now() |
| saldo_anterior | integer | sim | |
| saldo_novo | integer | sim | |

- Índices em lote_id, produto_id e usuario_id.
- CHECK:
  - `ck_stock_movements_tipo`
  - `ck_stock_movements_motivo_ajuste`
  - `ck_stock_movements_quantidade` (ajuste ≠ 0; entrada e saída > 0)
  - `ck_stock_movements_saldos_ajuste` (`saldo_novo - saldo_anterior = quantidade`)
- **Trigger RN-12:** `trg_stock_movements_imutavel BEFORE UPDATE OR DELETE ... FOR EACH STATEMENT` (`8b6569e6e529:46-60`). Ele **não cobre TRUNCATE** e dispara mesmo quando o DELETE não pega nenhuma linha.

**alerts** (`models/alert.py:20-62`)

| Coluna | Tipo | Nulo | Default |
|---|---|---|---|
| id | serial PK | não | nextval |
| tipo | varchar(20) | não | |
| produto_id | integer FK | não | |
| lote_id | integer FK composta | sim | |
| criado_em | timestamptz | não | now() |
| resolvido_em | timestamptz | sim | |

- Índice único parcial: `uq_alerts_ativo_tipo_produto_id_lote_id ... WHERE resolvido_em IS NULL`.
- CHECK: `ck_alerts_tipo` e `ck_alerts_lote_por_tipo`.

**demo_resets** (`models/demo_reset.py`)

| Coluna | Tipo | Nulo | Default |
|---|---|---|---|
| id | serial PK | não | nextval |
| recriado_em | timestamptz | não | |

Há também a `alembic_version`, que fica fora do `01-schema.sql` de propósito.

### 4.2 Chaves estrangeiras

Todas são `ON DELETE RESTRICT` e `ON UPDATE NO ACTION`.

| FK | Origem → destino | Evidência |
|---|---|---|
| `fk_products_fornecedor_id_suppliers` | products.fornecedor_id → suppliers.id | `product.py:39`, `5199c5b10be5:44` |
| `fk_batches_produto_id_products` | batches.produto_id → products.id | `batch.py:29`, `018922b5501a:31` |
| `fk_stock_movements_produto_id_products` | stock_movements.produto_id → products.id | `stock_movement.py:43` |
| `fk_stock_movements_lote_id_produto_id_batches` (composta) | (lote_id, produto_id) → batches(id, produto_id) | `stock_movement.py:33-38`, `2a9392eda790:26` (substitui a FK simples de `018922b5501a:47`) |
| `fk_stock_movements_usuario_id_users` | stock_movements.usuario_id → users.id | `stock_movement.py:53` |
| `fk_alerts_produto_id_products` | alerts.produto_id → products.id | `alert.py:57` |
| `fk_alerts_lote_id_produto_id_batches` (composta, MATCH SIMPLE) | (lote_id, produto_id) → batches | `alert.py:34-39` |

### 4.3 Dinheiro em DECIMAL

**Não existe nenhuma coluna monetária**, e não há `Numeric`, `Float` ou `Money` em lugar nenhum. As quantidades são
`integer`, que é o tipo certo. Onde uma coluna em `NUMERIC` faria sentido:

| Opção | Onde | Prós | Contras |
|---|---|---|---|
| **A: `custo_unitario NUMERIC(12,2)`** na entrada, com CHECK `>= 0` e "só em entrada" | `stock_movements` | Mais correta no domínio. A RN-28 soma entradas de mesma validade no mesmo lote, então um custo por lote seria ambíguo. O histórico imutável combina com o custo pago. Permite "valor em estoque" com GROUP BY | Mexe na entrada (API, tela, demo, seed). Uma correção de custo exigiria um novo tipo de movimentação |
| **B: `preco NUMERIC(10,2) NULL CHECK (preco >= 0)`** | `products` | Mais simples. Entra direto no CRUD de produto (formulário e lista), igual ao modelo do professor (`produto.preco DECIMAL(10,2)`) | Não é usada em nenhuma regra de estoque |
| C: `custo_medio NUMERIC(12,4)` | `batches` | Valor em estoque por lote | Exige manter um custo médio ponderado no service |

Cuidados:
- Um `ADD COLUMN` em `stock_movements` não dispara o trigger, mas um `UPDATE` de preenchimento seria recusado por ele.
- A mudança passa por uma migration nova (skill `new-migration`), com `01-schema.sql` e `seed.sql` gerados de novo.

### 4.4 Gerar o `db/schema.sql`

- **`alembic upgrade head --sql` (offline) não funciona** sem mudar código:
  - `9a0c1c19b39f:49` faz `conexao.execute(SELECT ...).all()`. No modo offline, `execute` devolve None, então dá erro sempre.
  - `5ce5fb9fdbd0:35` chama `bind.scalar(...)` quando `APP_DB_ROLE` tem valor. O `MockConnection` não tem `scalar`.
  - Também exige `DATABASE_URL` e `SECRET_KEY`, porque `env.py:9` importa o `config`.
  - Só iria até `5213613b4aa4`, sem a CHECK do código de barras.
- **O caminho certo é o `pg_dump --schema-only`** do banco migrado, que já foi usado e está documentado em `db/README.md`, seção "Prova".
  - Passos: criar `estoque_migrado`, rodar `alembic upgrade head` pela imagem da API (depois de `docker compose build api`), `pg_dump --no-owner --no-privileges --exclude-table=alembic_version` e `diff` contra o banco criado pelo script.
  - O serviço `db` **não publica porta** (`docker-compose.yml:22`), então tudo passa por `docker compose exec -T db`.
- O arquivo já existe como `db/postgres/01-schema.sql`, no mesmo padrão do modelo (`db/mysql/01-schema.sql`). **Não é preciso criar um `db/schema.sql`**; basta versionar a pasta.
- Detalhe a conferir no `db/README.md` e no `seed.sql:41`: o comentário diz que `DISABLE TRIGGER` pega trava ACCESS EXCLUSIVE. Pela documentação do PostgreSQL, pega SHARE ROW EXCLUSIVE, que também bloqueia escritas até o COMMIT. A conclusão do texto continua valendo.

### 4.5 Seed

- **Demo hoje** (`services/demo.py:157-165`, `scripts/reset_demo.py`): `drop_all` + `DROP alembic_version`/função, depois migrations e `permissoes.sincronizar`, e por fim os dados entram **pelos services, via ORM**. As contas usam Argon2, e o `senha_alterada_em` é marcado para invalidar tokens antigos (`demo.py:197-201`). Não há DELETE nem DROP SCHEMA.
- **`db/seed.sql`**: começa com DELETE das filhas para as mães (`seed.sql:46-56`), desligando o trigger da RN-12 dentro da própria transação. Usa IDs fixos e `setval` no fim. As contas do seed **não fazem login**.
- **O `seed.sql` não serve para uma rota de reset da API**, por oito motivos:
  1. `DISABLE TRIGGER` exige ser o dono da tabela.
  2. O `estoque_app` não tem DELETE em `stock_movements`.
  3. Nem acesso a `demo_resets` e sua sequência.
  4. `setval` exige UPDATE na sequência.
  5. Os metacomandos `\set` e `BEGIN/COMMIT` são do psql.
  6. O usuário 1 do seed é admin, com `senha_alterada_em` NULL, então um token antigo continuaria valendo (`deps.py:30-34`).
  7. O seed não grava a linha em `demo_resets`.
  8. Os dados não passam pelas regras dos services.

---

## 5. DELETE

### 5.1 Dependências por FK

| Excluir | Quem aponta para ele | Resultado no banco | Conclusão |
|---|---|---|---|
| **Fornecedor** | só `products.fornecedor_id` | Sem produtos: apaga. Com produtos: `ForeignKeyViolation` (23503, `fk_products_fornecedor_id_suppliers`) | Viável: 204, ou **409** com a contagem (RN-59) |
| **Produto** | `batches`, `stock_movements`, `alerts` | 23503 se houver lote, movimentação **ou alerta** | **Na prática, nunca**: `services/products.py:71` gera alertas ao salvar, e `condicoes.py:71-73` diz que estoque baixo é disponível ≤ mínimo. Saldo 0 ≤ mínimo vale sempre, então **todo produto nasce com um alerta ativo**, e a RN-39 proíbe apagar alertas |
| **Usuário** | `stock_movements.usuario_id` | 23503 se tiver movimentação | Já existe a desativação (`ativo`, RN-21/22). Não recomendo DELETE |

- Usar `CASCADE` em produto não resolve: o DELETE em `stock_movements` cairia no trigger da RN-12.
- Hoje **não existe nenhuma rota DELETE ou PUT** nem código de exclusão em `backend/app`.
- O CORS já libera os dois métodos (`main.py:56`), e o `frontend/src/api/client.ts:23` já tem os tipos.

### 5.2 Tratamento de IntegrityError

- Não há handler global. Cada service trata o seu pelo `erro.orig.diag.constraint_name`:
  - `services/suppliers.py:50-60`: só `uq_suppliers_cnpj`.
  - `services/products.py:73-78`: só `ix_products_codigo_barras`.
  - `services/users.py:48-53`: qualquer erro vira "e-mail já cadastrado", o que é amplo demais.
- **Corrida exigida pela RN-59 e pelo CT-24:** se o fornecedor for excluído entre a conferência e a gravação, o produto bate na FK e hoje recebe **500**. O `_salvar` relança tudo que não é código de barras. Precisa virar o 422 de fornecedor inexistente.

### 5.3 Permissões do `estoque_app`

- **O `estoque_app` já tem DELETE em users, suppliers, products, batches e alerts** (`core/permissoes.py:13`, `:45-50`, `:132`; migration `5ce5fb9fdbd0:54`, `:64-66`).
- O que ele não tem:
  - `stock_movements`: só SELECT e INSERT (`permissoes.py:18`, `:142`).
  - `alembic_version` e `demo_resets`: nenhum acesso (`:20-21`).
  - TRUNCATE, REFERENCES e TRIGGER: nunca (`:15`).
- **Para excluir fornecedor, nada muda no banco nem nas permissões**, e nenhum teste de permissão quebra. O `test_permissoes_banco.py:71-73` até exige esse DELETE.
- Se quiser que o banco também garanta a RN-23 (revogar DELETE de products, batches e alerts), aí é uma nova categoria em `permissoes.py`, mais a RN-58 e o teste `:71-73`. Lembre que as permissões vêm do `sincronizar_permissoes` a cada deploy (RN-58), nunca de GRANT manual.

### 5.4 Conta demo e limitador

- **RN-56** (`core/limiter.py:74-90`): é uma dependência por rota. A conta demo é sempre operador (`ck_users_demo_operador`), e com `require_admin` ela recebe 403 antes de contar.
  - Pôr o limite no DELETE mesmo assim mantém o padrão das outras rotas.
  - O **PUT precisa** do limite, porque a RN-56 já o cita.
- **RN-57** (teto de 100): excluir só libera vaga, então nada muda.
- **O professor não consegue ver uma exclusão com sucesso no site de demo**, por três motivos:
  1. Ele só tem a conta demo (operador). O admin é do dono, e a RN-55 proíbe criar outro.
  2. Os 3 fornecedores de exemplo têm produtos (`demo.py`, `_PRODUTOS`).
  3. Mesmo como admin, só um fornecedor novo dá 204.
  - Pelo site, ele vê só o CT-88: o botão escondido e o 403.
  - Para mostrar: docker compose local, o pytest do CT-85, o E2E ou capturas.

### 5.5 Regras afetadas (`docs/regras-negocio.md`)

| Regra | Linha | O que muda |
|---|---|---|
| RN-02 | :5 | Lista o que só o admin faz. Falta "exclui fornecedor" |
| RN-12, RN-37, RN-39 | :33, :40, :51 | Não mudam. São elas que impedem excluir produto |
| RN-19, RN-23, RN-59 | :20-22 | Já reescritas (sem commit). Faltam os comentários no código: `routers/suppliers.py:14`, `models/product.py:37`, `models/batch.py:27`, `ProdutosPage.tsx:26`, `FornecedoresPage.tsx:17` |
| RN-24 | :23 | A corrida tem que dar 422, não 500 |
| RN-25 | :24 | Deixar claro que o CNPJ fica livre depois da exclusão |
| RN-56 | :75 | Decidir se cita a exclusão |
| Auditoria | — | Não há registro de quem excluiu nem quando. Decidir se aceita a perda |

Se você decidir **permitir excluir produto**, as regras novas seriam:
- só o admin exclui;
- só produto sem lote e sem movimentação;
- uma exceção na RN-39 para apagar os alertas do próprio produto;
- trava `alertas.travar_produto` com `FOR UPDATE`, e o 23503 vira 409;
- o código de barras fica livre depois;
- o CT-23 deixa de ser 405.

A alternativa coerente com o projeto é **arquivar** (`ativo`), como já se faz com usuário. Mas arquivar não conta
como DELETE para o professor.

### 5.6 Testes que mudam

- **`backend/tests/test_cadastros.py:55` quebra**: espera 405 em `DELETE /suppliers/{id}`. O fornecedor da fixture tem produto, então o admin passaria a receber 409 e o operador 403.
- A linha 54 (produto, 405) continua valendo enquanto produto não puder ser excluído.
- CT-15 (`test_stock.py:495-516`), CT-41, CT-60 e CT-81 não são afetados.
- Fora do pytest: a tabela de rotas do `README.md:114-126` e o `docs/modelo-de-dados.md:34`.

---

## 6. Testes do backend e regras puras

### 6.1 Como o banco de teste funciona

- `tests/conftest.py:23-34` exige que `TEST_DATABASE_URL` termine em `_test`; se não, `pytest.exit`.
- A fixture `engine` (`:42-48`, escopo da sessão) recria o banco pelas migrations (`tests/banco.py:24-32`).
- A fixture `db` (`:51-66`) abre uma transação com savepoints e faz rollback no fim de cada teste. Usa o usuário dono.
- O usuário da aplicação aparece só em `test_permissoes_banco.py`, `test_sincronizar_permissoes.py` e `test_concorrencia.py`.
- Há só um marcador, `concorrencia` (`pytest.ini:4-5`). Não há `addopts`.
- **Atenção para os unitários:** o `conftest.py` importa `app.main`, e o `Settings` exige `DATABASE_URL` e `SECRET_KEY` (`config.py:138-152`). Os testes puros **não conectam**, mas precisam dessas variáveis (no CI, valores falsos bastam).

### 6.2 Classificação

| Arquivo | Casos | Sem banco | Com banco |
|---|---|---|---|
| test_alerts.py | 25 | 0 | 25 |
| test_auth.py | 14 | 0 | 14 |
| test_cadastros.py | 4 | 0 | 4 |
| test_concorrencia.py | 3 | 0 | 3 |
| test_config.py | 7 | 7 | 0 |
| test_cors.py | 5 | 5 | 0 |
| test_create_admin.py | 1 | 1 | 0 |
| test_dashboard.py | 9 | 0 | 9 |
| test_demo.py | 28 | 17 | 11 |
| test_health.py | 1 | 1 | 0 |
| test_migracao_codigo_barras.py | 11 | 0 | 11 |
| test_paginacao.py | 21 | 0 | 21 |
| test_partida_a_frio.py | 5 | 3 | 2 |
| test_permissoes_banco.py | 4 | 0 | 4 |
| test_products.py | 19 | 0 | 19 |
| test_seguranca_http.py | 9 | 9 | 0 |
| test_senhas.py | 20 | 1 | 19 |
| test_sincronizar_permissoes.py | 21 | 7 | 14 |
| test_stock.py | 54 | 0 | 54 |
| test_suppliers.py | 11 | 0 | 11 |
| **Total** | **272** | **51** | **221** |

### 6.3 Regras que já são puras ou podem ser extraídas

**Melhores candidatas para os ≥5 unitários com valor-limite:**

| # | Regra | Onde está | Situação | Limites a testar |
|---|---|---|---|---|
| 1 | **Situação do estoque** (RN-13, RN-41) | `services/condicoes.py:71` (`estoque_baixo`) e `:76` (`situacao`), hoje em SQL (`case`) | Extrair `situacao_estoque(disponivel, minimo)` em Python, com a SQL chamando a mesma regra | disponível 0 → sem estoque (mesmo com mínimo 0); = mínimo → baixo; mínimo−1 → baixo; **mínimo+1 → ok** (nunca testado); negativo → erro |
| 2 | **Situação do lote e dias para vencer** (RN-14, RN-15, RN-36, RN-42) | `condicoes.py:26`, `:31`, `:36` (`validade <= dia + dias_alerta`, `:45`), `:49` | Extrair `situacao_lote(...)` e `dias_para_vencer(validade, hoje)` | validade = hoje → a vencer e disponível; hoje−1 → vencido; hoje+dias → a vencer; hoje+dias+1 → ok; quantidade 0 → ok; None → ok |
| 3 | **Código de barras** (RN-04) | `schemas/products.py:9`, `:23` | Já pura | 50 ok, **51 recusa** (nunca testado), só espaços → vazio, U+00A0 removido |
| 4 | **CNPJ** (RN-25) | `services/suppliers.py:27` | Já pura | 13, 14, 15 dígitos; com pontuação; vazio → None |
| 5 | **Dias de alerta** (RN-26) | `services/products.py:43` | Já pura | controla: None, 0, −1 recusam e 1 aceita; não controla: 0 recusa |
| 6 | **FEFO** (RN-10) | `services/stock.py:185` (`_ordem_fefo`) | Já pura (lê `.validade` e `.id`) | menor validade primeiro, empate pelo id, None por último, lista vazia |
| 7 | **Distribuição da saída** (RN-09) | laço em `stock.py:205-228` | Extrair `distribuir_saida(lotes, qtd)` | pedido = disponível; disponível+1 recusa; = 1º lote; 1º lote+1 |
| 8 | **Teto da demo** (RN-57) | `services/teto_demo.py:19` | Extrair `excede_teto(total)` | 99 permite, **100 recusa** (hoje só é testado com o teto trocado para 2) |
| 9 | Validade na entrada (RN-31) | `stock.py:79` (usa `hoje()`) | Receber o dia como parâmetro | hoje ok, hoje−1 recusa |
| 10 | Senha | `schemas/users.py:7-8,22` | Já pura (Pydantic) | 7, 8, 128, 129 |
| 11 | Paginação (RN-51) | `schemas/paginacao.py:29-31` | `TypeAdapter` | limite 0, 1, 200, 201; padrão 50 |
| 12 | Dia de Brasília | `core/clock.py:12` | Pura com monkeypatch | 02:59 UTC é o dia anterior; 03:00 UTC é o dia seguinte |

Testes puros com limite que já existem: `test_demo.py:203` (24 h), `test_config.py` (SECRET_KEY 31/32).

Validators Pydantic com limite (todos testáveis com `Model.model_validate`): `Nome` 120, `EstoqueMinimo` ≥0,
`FornecedorId` ≥1, `CnpjEntrada` 20, `Motivo` 255, `quantidade` >0 (`schemas/stock.py:16`, `:77`) e
`saldo_contado` ≥0 (`:109`).

**Onde colocar:** pelo CLAUDE.md, a regra fica no service. Sugestão: um módulo puro `backend/app/services/regras.py`,
sem Session, e `condicoes.py` passa a usá-lo.

---

## 7. Swagger

- **Como liga:** `main.py:39-44` usa `documentacao = not settings.em_producao`. Em produção, `/docs`, `/redoc` e `/openapi.json` viram `None`.
  - `config.py:55` aceita só `development` e `production`.
  - `config.py:69-71` derruba a API se rodar no Render sem `APP_ENV=production`.
  - Esse comportamento é protegido por testes: `test_seguranca_http.py:46-56` e `:70-73`.
- **No Render, ficam 404**: `render.yaml:36-37`, `docs/deploy.md:133`, `README.md:21,103`.
  - Aparecem em `http://localhost:8000/docs`: localmente e no docker compose (`docker-compose.yml:41`, `APP_ENV: development`).
  - Para mostrar no Render, só com código novo, por exemplo uma flag `DOCS_PUBLICOS`. Isso exige ajustar os testes e o `deploy.md`.
- **Nada bloqueia o Swagger UI**: não há CSP, e os cabeçalhos de `main.py:15-19` não impedem o CDN.
- **O botão Authorize funciona**: `core/deps.py:11` (`OAuth2PasswordBearer(tokenUrl="/auth/login")`). No campo `username` vai o **e-mail**, e o limite é de 10 logins por minuto.
- **Qualidade da documentação:**
  - Pontos bons: tags por router e `response_model` em todas as rotas. As docstrings dos schemas viram descrição.
  - Falta:
    1. `description`, `version` e `openapi_tags` no `FastAPI(...)`. Hoje só tem `title`, e a versão fica `0.1.0`.
    2. `summary` em cada rota. Hoje aparecem "Listar", "Criar", "Obter" e "Atualizar" repetidos, vindos do nome das funções.
    3. `responses={401, 403, 404, 409, 422}` com um `ErroOut`. Hoje só aparecem o 200/201 e o 422 automático.
    4. Exemplos (`json_schema_extra` ou `Field(examples=...)`) nos `*Create`.
    5. Uma tag para o `/health`.

---

## 8. E2E (Playwright)

### 8.1 Os testes de hoje

| Spec | Teste (linha) | O que cobre | Seletores |
|---|---|---|---|
| estoque.spec.ts (banco vazio, serial) | login do admin (:90) | login, menu | `getByLabel`, `getByRole` |
| | cadastro de fornecedor e de dois produtos (:97) | **C** de fornecedor e produto, **R** da lista com paginação | `getByLabel`, `getByRole`, `getByText('Fornecedor cadastrado')` |
| | entrada pelo código de barras (:132) | lotes, estoque baixo | `getByLabel`, `getByText`, `getByRole('row')` |
| | código copiado da lista e colado na Entrada (:145) | CT-82 | `.codigo-barras__digitos` (classe CSS) |
| | saída FEFO em dois lotes (:164) | FEFO, alerta de vencimento | `.alertas > li`, `.saida__lote` (classes) |
| | ajuste com confirmação (:185) | diálogo | `getByRole('alertdialog')`, `.aviso` |
| | alerta e "Verificar agora" (:205) | alertas | `getByRole`, `getByText` |
| | operador sem acesso a Usuários e Ajustes (:229) | perfis, 403 | `getByRole` + `fetch` com o token |
| | troca da própria senha (:247) | RN-48 | `getByLabel` |
| | cadastro de usuário com e-mail repetido (:262) | **caminho de erro** (409) | `getByText` |
| barra-inferior.spec.ts (dados da demo, serial) | 6 testes (:42 a :131) | navegação no celular | `getByRole`, `[aria-current]` |
| responsividade.spec.ts | 1 teste × 10 larguras (:374) | rolagem horizontal; abre a lista, o detalhe, o novo e o editar, **sem salvar** | `getByRole`, `getByLabel`, `querySelectorAll` |

### 8.2 Como o banco é preparado

- `frontend/e2e/rodar.mjs` gera as senhas na memória (`:116-125`) e chama `backend/tests/e2e_preparar.py`, que recria o `estoque_e2e` pelas migrations (`banco.recriar_banco`) e cria o admin e o operador (`:97-108`).
- Sobe a API na porta 8001 com o usuário da aplicação (`e2e_ambiente.py:50-55` define `DATABASE_URL` = app e `MIGRATIONS_DATABASE_URL` = dono, e desliga o `DEMO_MODE`) e o site na 5175.
- Roda o `estoque.spec.ts`, recria com `--demo` (`rodar.mjs:197`) e roda os outros dois.
- **O reset é por arquivo, não por teste.**

**Por que é em série:** `playwright.config.ts:15-16` (`fullyParallel: false`, `workers: 1`) e `describe.serial`.
- O `estoque.spec.ts` é uma história: cadastro → entrada → saída FEFO → ajuste → alerta → senha.
- A página e o login são compartilhados, por causa da **RN-47** (10 logins por minuto por IP; `limiter.py:20`).
- **O `storageState` não serve**, porque o token fica no `sessionStorage` (`frontend/src/auth/token.ts:1-2`). O padrão que já funciona é `addInitScript` com `sessionStorage.setItem` (`responsividade.spec.ts:333`).

### 8.3 O que falta para resetar antes de cada teste

1. **Uma rota `POST /_test/reset`** que só exista no ambiente de teste, como no modelo (`if APP_ENV == "test"`).
   - Hoje o `APP_ENV=test` derruba a API (`config.py:55-64`). As saídas são acrescentar `test` em `AMBIENTES` ou criar uma flag própria (`E2E_RESET=true`) ligada só pelo `e2e_ambiente.configurar()`, além da trava do sufixo `_e2e`.
   - Precisa de **um teste que prove que a rota não existe** sem a flag e em produção.
2. **Como limpar:**
   - O `estoque_app` não consegue: não tem TRUNCATE nem DELETE no histórico.
   - **`TRUNCATE alerts, stock_movements, batches, products, suppliers, users RESTART IDENTITY CASCADE` com o usuário dono** funciona: o trigger da RN-12 não dispara em TRUNCATE, e a URL do dono já está em `settings.MIGRATIONS_DATABASE_URL` no E2E. Usar um engine com NullPool e `lock_timeout`, como em `demo.py`. Deve levar dezenas de ms.
   - Recriar pelas migrations, como o `e2e_preparar.py`, levaria cerca de 1 a 3 s por teste (estimativa, não medida).
3. **Contas depois do reset:**
   - A API hoje **não recebe as senhas** (`rodar.mjs:123-125`). Seria preciso passá-las à API do E2E, por variável de ambiente e só em memória, ou criar as contas por um script fora da API.
   - Marcar `senha_alterada_em` no reset, senão um token antigo continua valendo depois do `RESTART IDENTITY`.
4. **Chamar `limiter.reset()` dentro da rota.** Isso zera a RN-47 e permite logar em cada teste; um script externo não alcança essa memória.
5. **No Playwright:** um `test.beforeEach` (ou fixture `auto`) chama o reset, faz o login e injeta o token. Cada teste semeia o próprio estado pela API.
   - O `estoque.spec.ts` precisaria ser quebrado em testes independentes, ou o CRUD vai num spec novo.
6. **`testIdAttribute: 'data-cy'`** em `playwright.config.ts:25-35` (`use`), e os testes passam a usar `getByTestId(...)`.

### 8.4 `data-cy` necessários (CRUD de produtos; o de fornecedores segue o mesmo padrão)

Convenção do modelo: `input-<campo>`, `select-<campo>`, `btn-<acao>`, `tabela-<coisa>`, linha `produto-<chave>`, `mensagem`.

| Elemento | Onde | Sugestão |
|---|---|---|
| Botão "Cadastrar produto" (cabeçalho e estado vazio) | `ProdutosPage.tsx:62-64`, `:106-108` | `btn-novo-produto` |
| Busca e "Limpar busca" | `ProdutosPage.tsx:77-86`, `:121` | `input-busca`, `btn-limpar-busca` |
| Tabela e linha | `ProdutosPage.tsx:130`, `:144` | `tabela-produtos`, `produto-<codigo_barras>` |
| Link do nome (vai ao detalhe) | `ProdutosPage.tsx:146` | `link-produto` |
| Estados (carregando, erro, vazio) | `ProdutosPage.tsx:97-126` | `estado-carregando`, `estado-erro`, `estado-vazio` |
| Paginação | `ProdutosPage.tsx:172`, `Paginacao.tsx:44-64` | `btn-pagina-anterior`, `btn-pagina-proxima` |
| Botão Editar (no detalhe; a linha não tem) | `ProdutoDetalhePage.tsx:261-263` | `btn-editar` |
| Campos do formulário | `ProdutoFormPage.tsx:209`, `:219`, `:230`, `:241` (`SelecaoComBusca`), `:255`, `:271` | `input-nome`, `input-codigo-barras`, `input-estoque-minimo`, `select-fornecedor`, `check-controla-validade`, `input-dias-alerta` |
| Salvar e Cancelar | `ProdutoFormPage.tsx:286`, `:289` | `btn-salvar`, `btn-cancelar` |
| Erro de campo | `Campo.tsx:39-43` (`<p class="campo__erro">`) | `erro-<campo>` |
| Erro geral e mensagem de sucesso | `ProdutoFormPage.tsx:204-208`; `ProdutoDetalhePage.tsx:268-272`; `ProdutosPage.tsx:69-73` | `mensagem` (sucesso), `mensagem-erro` |
| Excluir e diálogo (novo) | linha da lista ou detalhe; `ConfirmarDialogo.tsx:32-48` | `btn-excluir`, `dialogo-confirmar`, `btn-confirmar`, `btn-cancelar-dialogo` |

Fornecedores:
- "Novo" em `FornecedoresPage.tsx:42-44`; tabela em `:76`; linha em `:89` (chave `fornecedor-<id>`, porque o CNPJ é opcional).
- Editar na linha em `:101-107`; o Excluir entraria na mesma célula (`:100`).
- Formulário: `FornecedorFormPage.tsx:83` (nome), `:96` (cnpj), `:112` (salvar), `:115` (cancelar).
- A lista de fornecedores não tem busca.

**Componentes:**
- `Botao`, `BotaoLink`, `Campo` (só no `<input>`), `CampoSelecao` e `CaixaDeMarcar` já repassam `...resto`, então o `data-cy` passa direto.
- **`Aviso`, `SelecaoComBusca`, `Paginacao`, `Estados`, `ConfirmarDialogo` e o `<p>` de erro do `Campo` não repassam**: precisam de uma prop nova.

---

## 9. Frontend: edição e confirmação

- **Edição:** produto e fornecedor permitem criar e editar, sempre por **PATCH** com os campos alterados (`ProdutoFormPage.tsx:169`, `FornecedorFormPage.tsx:58`).
  - Rotas em `App.tsx:34-40`. O fornecedor não tem página de detalhe.
  - A RN-19 nova manda o formulário de fornecedor usar **PUT** com o corpo completo (CT-89).
- **Excluir:** não existe. Os comentários `ProdutosPage.tsx:26` e `FornecedoresPage.tsx:17` citam a RN-23 antiga.
- **`ConfirmarDialogo.tsx` serve para o Excluir:**
  - É um Radix `AlertDialog` (`role="alertdialog"`): prende o foco, fecha com Esc e devolve o foco a quem abriu.
  - Props (`:5-17`): `aberto`, `aoMudar`, `titulo`, `descricao`, `textoConfirmar`, `aoConfirmar`, `carregando`, `perigo` e `aoFecharFoco`.
  - Já é usado com `perigo` em `UsuarioFormPage.tsx:241` (desativar usuário) e em `AjustesPage.tsx:235`.
  - Para o E2E, falta repassar `data-cy` ao conteúdo e aos dois botões.
- **Vitest:** 9 arquivos e 82 testes, sobre cliente HTTP, endereço da API, paginação, régua de vencimentos, leitura de código, demo, formulário de produto (só o `?codigo=`), formatos e vencimentos. **Nenhum teste de formulário de fornecedor.**

---

## 10. CI e README

### 10.1 CI (`.github/workflows/ci.yml`)

- Gatilhos: `push` na `main` e qualquer `pull_request` (`:3-6`), igual ao modelo.
- Jobs:

| Job | Linhas | O que faz |
|---|---|---|
| `backend` | `:14-71` | postgres:18, Python 3.14, `pip install -r requirements-dev.txt`, cria os usuários e o banco `_test`, roda **`pytest -rs`** |
| `frontend` | `:73-95` | Node 24, `npm ci`, **`npm run test`** |
| `e2e` | `:97-172` | postgres:18, cria o venv e o `estoque_e2e`, instala o Chromium, roda **`npm run test:e2e`** e envia o relatório se falhar |

- **O que não roda:** cobertura, `npm run build`, `npm run lint`, `pip-audit` e build do Docker.
- **O que mudar:**
  1. Acrescentar `pytest-cov` no `requirements-dev.txt` e usar `pytest -rs --cov=app --cov-report=term-missing --cov-fail-under=80`, com o `omit` de `app/scripts` se você decidir.
  2. Marcadores `unitario` e `integracao`, aplicados automaticamente no `conftest` pelo uso das fixtures `engine` e `db`, ou as pastas `tests/unit` e `tests/integracao`.
  3. Um job `unitarios` sem postgres (variáveis falsas) e um `integracao` com postgres. Para manter os 80%, a cobertura tem que ser somada: `--cov-append` no mesmo job, ou `coverage combine`.
  4. Opcionais: `needs: [backend, frontend]` no `e2e`, `lint` e `build` no `frontend`.

### 10.2 README

- **Já tem:**
  - docker compose (`:161-195`, `up --build -d`, `logs`, `down -v`, `reset_demo`);
  - instalação local (`:197-231`);
  - pré-requisitos dos bancos `_test` e `_e2e` (`:233-256`);
  - testes (`:258`: `pytest`, `npm run test`, `npm run test:e2e`).
- **Falta:**
  - `pytest -m unitario` e `pytest -m integracao` (ou os equivalentes);
  - cobertura;
  - os scripts SQL do `db/`, com link para o `db/README.md`;
  - `npm run lint` e `npm run build`;
  - a tabela das camadas de teste, como no modelo;
  - o roteiro da apresentação, se quiser;
  - a tabela de rotas com DELETE e PUT (`:114-126`), depois da implementação.
- Detalhe: o `pip install -r requirements.txt -r requirements-dev.txt` (`:207`) é redundante, porque o dev já inclui o principal.

---

## 11. Riscos

| Risco | Onde | Como evitar |
|---|---|---|
| A rota de reset chegar à produção e apagar o banco | `main.py`, `config.py` | Registrar a rota só com flag + banco `_e2e` + fora de produção; teste que prova 404 sem a flag; nunca usar `APP_ENV` sozinho, porque `config.py:69-71` já obriga `production` no Render |
| A migration de DECIMAL quebrar o deploy | `render.yaml:17` (migrations no start), Neon | Só `ADD COLUMN` nulo, sem UPDATE em `stock_movements` (o trigger recusa). Coluna nova não precisa de GRANT; **tabela nova** precisaria entrar em `core/permissoes.py` (RN-58) |
| `01-schema.sql` desatualizado depois da migration | `db/` | Gerar de novo e rodar o diff do `db/README.md` (antes, `docker compose build api`) |
| A demo quebrar | `services/demo.py` | Atualizar `_PRODUTOS` e as entradas se a coluna nova for obrigatória; o professor não vê a exclusão com sucesso pelo demo (5.4) |
| Testes atuais quebrarem | `test_cadastros.py:55` (CT-23); `test_seguranca_http.py:52-56` se ligar o `/docs` em produção | Ajustar junto com cada PR |
| E2E instável com reset por teste | RN-47 (10 logins/min), token no `sessionStorage`, specs em série | `limiter.reset()` na rota, injeção do token, CRUD num spec novo |
| Abrir o Swagger em produção expõe o mapa da API | `main.py:39` | Decisão sua: só local/docker ou uma flag explícita; o Authorize já exige login |
| Corrida na exclusão de fornecedor | `services/products.py:73-78` | Mapear o 23503 da FK para 422 (produto) e 409 (exclusão), com testes de concorrência como os de `test_concorrencia.py` |
| docker-compose | `docker-compose.yml:51` (`DEMO_MODE` fixo) | Se o reset entrar no compose, nunca ligar a flag de teste nele |
| Cobertura cair abaixo de 80% ao separar as suítes | CI | Somar a cobertura das duas suítes |
| Muitas mudanças nos docs sem commit nesta branch | `PRODUCT.md`, `docs/*.md`, `db/` | Fazer o commit de cada parte no PR certo (`db/` vem da branch `feat/scripts-sql`) |

---

## 12. Plano de implementação (uma etapa por branch e PR)

| # | Branch / título do PR | Arquivos | Risco |
|---|---|---|---|
| 1 | `feat/scripts-sql` → **`feat: scripts SQL de esquema e seed do banco`** | `db/postgres/01-schema.sql`, `db/seed.sql`, `db/README.md` (corrigir o comentário da trava), link no `README.md` | Baixo: não toca a aplicação |
| 2 | `feat/excluir-fornecedor` → **`feat: exclusão e substituição de fornecedor`** (RN-59, CT-85 a CT-90) | `routers/suppliers.py` (DELETE 204, PUT), `services/suppliers.py` (excluir com contagem, 23503 → 409), `schemas/suppliers.py` (`SupplierReplace`), `services/products.py` (23503 da FK → 422), `tests/test_suppliers.py`, `tests/test_cadastros.py` (CT-23), `FornecedoresPage.tsx` (Excluir + `ConfirmarDialogo`, só admin), `FornecedorFormPage.tsx` (PUT), comentários da RN-23, `docs/regras-negocio.md` (RN-02), `README.md` (rotas), `docs/modelo-de-dados.md` | Médio: muda uma regra e um teste antigo; corrida com FK |
| 2b | *(opcional, se decidir)* **`feat: exclusão de produto sem movimentação`** | `routers/products.py`, `services/products.py`, `services/alerts.py`, RN-23/RN-39, CT novo, `ProdutoDetalhePage.tsx` | Alto: contraria a RN-39 (alertas) |
| 3 | **`feat: valor em DECIMAL`** (opção A ou B da seção 4.3) | migration nova, `models/`, `schemas/`, `services/`, tela (`EntradaPage.tsx` ou `ProdutoFormPage.tsx`), `services/demo.py`, `db/*.sql`, `docs/modelo-de-dados.md`, `docs/regras-negocio.md`, testes | Médio: migration em produção (Neon) |
| 4 | **`test: regras puras com testes unitários sem banco`** | `services/regras.py` (novo), `services/condicoes.py`, `services/stock.py`, `services/teto_demo.py`, `tests/unit/test_regras.py` (novo), `pytest.ini` (marcadores), `tests/conftest.py` | Baixo/médio: refatora `condicoes.py` (a SQL tem que continuar igual) |
| 5 | **`test: cobertura com pytest-cov`** | `requirements-dev.txt`, `pytest.ini` ou `.coveragerc`, `README.md` | Baixo |
| 6 | **`feat: reset do banco antes de cada teste de ponta a ponta`** | `core/config.py` (flag), `main.py` ou `routers/teste.py` (rota), `services/` (reset com o dono, TRUNCATE + contas + `limiter.reset()`), `tests/e2e_ambiente.py`, `frontend/e2e/rodar.mjs` (senhas para a API do E2E), `tests/test_seguranca_http.py` (a rota não existe fora do teste) | **Alto**: segurança (apagar tudo) |
| 7 | **`test: CRUD de ponta a ponta com data-cy`** | `playwright.config.ts` (`testIdAttribute`), `frontend/e2e/crud-fornecedores.spec.ts` ou `crud-produtos.spec.ts` (novo: criar, ler, editar, excluir + erro; `beforeEach` com reset), `data-cy` nas páginas e componentes da seção 8.4 (`Aviso`, `ConfirmarDialogo`, `Campo`, `SelecaoComBusca`, `Paginacao`, `Estados`); talvez dividir o `estoque.spec.ts` | Médio: muitos arquivos do frontend (lint, ui-reviewer) |
| 8 | **`feat: documentação da API no Swagger`** | `main.py` (`description`, `version`, `openapi_tags`, flag opcional), todos os `routers/*.py` (`summary`, `responses`), `schemas/*.py` (exemplos, `ErroOut`), `docs/deploy.md` | Baixo (médio se ligar em produção) |
| 9 | **`ci: suítes separadas, cobertura mínima, lint e build`** | `.github/workflows/ci.yml` | Baixo |
| 10 | **`docs: README com os comandos de cada suíte`** | `README.md` (camadas de teste, comandos, scripts SQL, Swagger, roteiro) | Baixo |

A ordem tem um motivo:
- A 1 e a 2 já estão quase prontas.
- A 3 mexe no esquema; depois dela, os scripts SQL são gerados de novo.
- A 4 e a 5 dão a base de testes.
- A 6 precisa vir antes da 7.
- A 8, a 9 e a 10 fecham a entrega.

---

## 13. Perguntas que você precisa decidir

1. **Qual entidade mostra o CRUD completo ao professor?** O fornecedor já tem regra (RN-59) e um DELETE viável. O produto não pode ser excluído sem mudar a RN-39. Os `data-cy` e o E2E do CRUD ficam no fornecedor, no produto ou nos dois?
2. **Excluir produto:** manter proibido (RN-23), permitir só sem lote e sem movimentação (apagando os próprios alertas, uma exceção na RN-39), ou arquivar (que não conta como DELETE)?
3. **Coluna em DECIMAL:** custo unitário na entrada (`stock_movements`, mais correto, mais trabalho) ou preço no produto (simples, aparece no CRUD)? Ela entra em alguma consulta com GROUP BY (ex.: valor em estoque no painel)?
4. **Swagger no Render:** continua só local e no docker (decisão de segurança atual) ou liga em produção com uma flag explícita?
5. **Reset do E2E:** rota na API com uma flag própria (`E2E_RESET`) ou com `APP_ENV=test`, como no modelo (exige mudar o `config.py`)? Pode passar as senhas do admin e do operador do E2E para o processo da API, só em memória?
6. **O `estoque.spec.ts` (história em série)** é reescrito em testes independentes, ou só os specs novos do CRUD resetam antes de cada teste? O professor pede o reset para *cada* teste E2E.
7. **Testes unitários:** pasta `tests/unit` + `tests/integracao` (como no modelo) ou marcadores automáticos sem mover arquivos?
8. **Cobertura:** medir `app/scripts` (e escrever testes para o `create_admin` e o `sincronizar_permissoes`) ou excluí-los com `omit`?
9. **Exclusão de fornecedor:** guardar um registro de quem excluiu e quando (auditoria), ou aceitar que não fica registro?
10. **Demonstração para o professor:** como ele vai ver o DELETE funcionando, já que a conta demo é operador? Docker local na apresentação, vídeo, ou credencial de admin em particular?
11. **CI a cada push:** acrescentar `push` em todas as branches (o texto do INTENSIVO diz "a cada push", mas o modelo usa só a main + PRs)?
12. **Nomes das restrições:** manter `users_pkey` e `ix_*` (decisão atual) ou criar uma migration para usar `pk_*`/`uq_*` como no modelo? A rubrica não exige.
