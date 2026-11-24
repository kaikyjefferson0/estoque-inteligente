# Scripts SQL do banco

Scripts pedidos pela disciplina de Banco de Dados: o esquema (`CREATE TABLE`) e a carga de
exemplo (seed), em SQL puro, para PostgreSQL 18.

| Arquivo | O que faz |
|---|---|
| [`postgres/01-schema.sql`](postgres/01-schema.sql) | Cria as 7 tabelas com PK, FK, UNIQUE e CHECK, os índices, a função e o trigger da RN-12. Numa transação só. |
| [`seed.sql`](seed.sql) | Apaga tudo (das filhas para as mães), insere os dados de exemplo com IDs fixos e ajusta as sequências. Pode rodar várias vezes. |

## Relação com o Alembic

**A fonte oficial do esquema continua sendo o Alembic** (`backend\alembic\versions`). A API, os
testes, o teste de ponta a ponta e o deploy criam o banco pelas migrations, nunca por estes scripts.

O `01-schema.sql` é uma cópia legível do banco migrado até a revisão `8f3454618767` (head),
gerada com `pg_dump --schema-only` e organizada à mão. Ele é igual ao banco das migrations, com
duas exceções de propósito:

- não cria a `alembic_version`, que é do Alembic;
- não define dono nem permissões. Na aplicação, o usuário da API (`estoque_app`) recebe as
  permissões pela migration `5ce5fb9fdbd0` e pelo `app.scripts.sincronizar_permissoes` (RN-50, RN-58).

Os nomes são os do banco migrado: `fk_`, `uq_` e `ck_` em todas as restrições, mas as chaves
primárias têm o nome padrão do PostgreSQL (`users_pkey`, `products_pkey`...), e o e-mail e o
código de barras são únicos por índice único (`ix_users_email`, `ix_products_codigo_barras`),
porque é assim que as migrations os criam. Renomear exigiria uma migration nova.

**Mudou alguma migration?** Gere o script de novo e confira com a prova abaixo. Os dois
precisam andar juntos: um `01-schema.sql` desatualizado não avisa nada sozinho.

**Não misture os dois caminhos no mesmo banco.** Use estes scripts num banco separado (como o
`estoque_sql` abaixo), nunca no `estoque_inteligente` da aplicação.

## Como rodar

### Com o Postgres do docker-compose (cmd, na raiz do projeto)

O serviço `db` não publica porta, então o arquivo vai pela entrada padrão (`<`):

```bat
docker compose up -d db
docker compose exec -T db psql -U estoque -d postgres -c "CREATE DATABASE estoque_sql"
docker compose exec -T db psql -U estoque -d estoque_sql < db\postgres\01-schema.sql
docker compose exec -T db psql -U estoque -d estoque_sql < db\seed.sql
```

Para começar do zero: `docker compose exec -T db psql -U estoque -d postgres -c "DROP DATABASE estoque_sql"`
e repita a partir do `CREATE DATABASE`.

### Com um PostgreSQL acessível pelo psql

```bat
psql -U estoque -d estoque_sql -f db\postgres\01-schema.sql
psql -U estoque -d estoque_sql -f db\seed.sql
```

O `01-schema.sql` espera um banco vazio e para no primeiro erro, sem deixar nada criado.
Os dois scripts precisam rodar com o **dono** das tabelas (`estoque`), não com o `estoque_app`.

## Os dados do seed

| Produto | O que exercita |
|---|---|
| 1 Leite integral 1 L | lote que vence em 3 dias, com alerta de 7: **vencimento próximo** (RN-14); saída pelo lote que vence antes (FEFO, RN-10) |
| 2 Arroz branco 5 kg | saldo 10 = mínimo 10: **no limite**, já é estoque baixo (RN-13) |
| 3 Feijão carioca 1 kg | entrou 20, saiu 20: **sem estoque**; o lote zerado continua (RN-37) |
| 4 Café torrado 500 g | estoque normal, com um alerta antigo já resolvido (RN-39) |
| 5 Iogurte natural 170 g | um lote **vencido** há 2 dias (RN-15) e outro bom |
| 6 Detergente neutro 500 ml | **ajuste** de -2 com motivo e saldos anterior e novo (RN-33, RN-34) |
| 7 Sabonete 90 g | sem fornecedor (RN-24), estoque mínimo 0 e **sem preço** (`preco` NULL, RN-60) |
| 8 Pão de forma 500 g | controla validade, lote dentro da validade |

Também há 2 usuários, 3 fornecedores, 10 lotes, 13 movimentações e 5 alertas. O saldo de cada lote é
a soma das suas movimentações, e os alertas ativos são os que a geração de alertas da API criaria.
As validades são calculadas a partir do "hoje" de Brasília (RN-36), então o seed fica certo em
qualquer dia em que rodar.

Os usuários do seed **não fazem login**: o `senha_hash` não é um hash Argon2 válido, e a API trata
isso como senha errada. Eles existem porque toda movimentação aponta para um usuário (FK).

### O seed e o histórico imutável (RN-12)

O trigger `trg_stock_movements_imutavel` recusa `UPDATE` e `DELETE` em `stock_movements`. Para
recomeçar do zero, o seed desliga esse trigger só em volta do `DELETE` e o religa logo depois, tudo
dentro da mesma transação:

- o `ALTER TABLE` trava a tabela em `SHARE ROW EXCLUSIVE` até o `COMMIT`: outras conexões ainda
  conseguem ler, mas nenhuma consegue gravar (`INSERT`, `UPDATE` ou `DELETE`) enquanto o trigger
  está desligado. Elas esperam o `COMMIT`, e aí o trigger já voltou;
- se o seed falhar, o `ROLLBACK` desfaz o `DISABLE`, e o trigger volta ligado;
- só o dono da tabela consegue fazer isso. O `estoque_app`, usuário da API, não é dono e nem tem
  `DELETE` em `stock_movements` (RN-50). Para a aplicação, a regra continua igual.

Fora do seed, o trigger segue valendo, inclusive para o dono:

```bat
docker compose exec -T db psql -U estoque -d estoque_sql -c "DELETE FROM stock_movements WHERE id = 1"
```
```
ERROR:  stock_movements é imutável (RN-12): DELETE não é permitido
HINT:  Para corrigir o estoque, registre um ajuste.
CONTEXT:  PL/pgSQL function stock_movements_imutavel() line 3 at RAISE
```

## Restrições sendo violadas (para a apresentação)

Rode depois do seed. Nenhum comando grava nada: o banco recusa a linha inteira. As mensagens
aparecem em inglês porque é o idioma do servidor da imagem `postgres:18-alpine`; o que importa é
o nome da restrição entre aspas.

**UNIQUE**: CNPJ repetido (RN-25). O `11222333000181` já é do fornecedor 1.

```bat
docker compose exec -T db psql -U estoque -d estoque_sql -c "INSERT INTO suppliers (nome, cnpj) VALUES ('Fornecedor repetido', '11222333000181')"
```
```
ERROR:  duplicate key value violates unique constraint "uq_suppliers_cnpj"
DETAIL:  Key (cnpj)=(11222333000181) already exists.
```

**CHECK**: estoque mínimo negativo.

```bat
docker compose exec -T db psql -U estoque -d estoque_sql -c "INSERT INTO products (nome, codigo_barras, estoque_minimo) VALUES ('Produto teste', '7899999999999', -1)"
```
```
ERROR:  new row for relation "products" violates check constraint "ck_products_estoque_minimo_nao_negativo"
DETAIL:  Failing row contains (9, Produto teste, 7899999999999, -1, f, null, null, <data e hora>, null).
```

**CHECK**: preço negativo (RN-60). Sem preço (NULL) é aceito; negativo, nunca, nem no INSERT nem no UPDATE.

```bat
docker compose exec -T db psql -U estoque -d estoque_sql -c "INSERT INTO products (nome, codigo_barras, preco) VALUES ('Produto teste', '7899999999999', -0.01)"
```
```
ERROR:  new row for relation "products" violates check constraint "ck_products_preco_nao_negativo"
DETAIL:  Failing row contains (9, Produto teste, 7899999999999, 0, f, null, null, <data e hora>, -0.01).
```

```bat
docker compose exec -T db psql -U estoque -d estoque_sql -c "UPDATE products SET preco = -1 WHERE id = 1"
```
```
ERROR:  new row for relation "products" violates check constraint "ck_products_preco_nao_negativo"
DETAIL:  Failing row contains (1, Leite integral 1 L, 7890000000011, 10, t, 7, 1, <data e hora>, -1.00).
```

Por que `NUMERIC` e não `float`: a soma de 0,10 com 0,20 é exata no `NUMERIC` e erra no `float8`.

```bat
docker compose exec -T db psql -U estoque -d estoque_sql -c "SELECT 0.10::numeric(10,2) + 0.20::numeric(10,2) AS numeric, 0.10::float8 + 0.20::float8 AS float8"
```
```
 numeric |       float8
---------+---------------------
    0.30 | 0.30000000000000004
```

**FK**: fornecedor que não existe (RN-24).

```bat
docker compose exec -T db psql -U estoque -d estoque_sql -c "INSERT INTO products (nome, codigo_barras, fornecedor_id) VALUES ('Produto teste', '7899999999999', 99)"
```
```
ERROR:  insert or update on table "products" violates foreign key constraint "fk_products_fornecedor_id_suppliers"
DETAIL:  Key (fornecedor_id)=(99) is not present in table "suppliers".
```

Extra, UNIQUE pelo índice único do código de barras (RN-04):

```bat
docker compose exec -T db psql -U estoque -d estoque_sql -c "INSERT INTO products (nome, codigo_barras) VALUES ('Leite repetido', '7890000000011')"
```
```
ERROR:  duplicate key value violates unique constraint "ix_products_codigo_barras"
DETAIL:  Key (codigo_barras)=(7890000000011) already exists.
```

Extra, FK ao apagar (`ON DELETE RESTRICT`): o fornecedor 1 tem produtos.

```bat
docker compose exec -T db psql -U estoque -d estoque_sql -c "DELETE FROM suppliers WHERE id = 1"
```
```
ERROR:  update or delete on table "suppliers" violates RESTRICT setting of foreign key constraint "fk_products_fornecedor_id_suppliers" on table "products"
DETAIL:  Key (id)=(1) is referenced from table "products".
```

O id na linha `Failing row contains (9, ...)` vem da sequência. Cada INSERT recusado gasta um
número dela, então numa segunda tentativa o id é outro. Rodar o seed de novo volta tudo ao estado inicial.

## Prova: o script é igual ao banco migrado

Num banco migrado pelo Alembic (`estoque_migrado`) e num criado pelo script (`estoque_sql`, veja
"Como rodar"), compare o esquema dos dois. A linha `\restrict` do pg_dump tem uma chave aleatória
e fica de fora. Comandos em bash (Git Bash), na raiz do projeto:

```sh
# Banco migrado: roda as migrations com a imagem da API, trocando só o nome do banco na URL do dono.
# Antes, `docker compose build api`, para a imagem ter as migrations atuais.
docker compose exec -T db psql -U estoque -d postgres \
  -c "DROP DATABASE IF EXISTS estoque_migrado" -c "CREATE DATABASE estoque_migrado"
MSYS_NO_PATHCONV=1 docker compose run --rm --no-deps -T api sh -c \
  'export MIGRATIONS_DATABASE_URL="${MIGRATIONS_DATABASE_URL%/*}/estoque_migrado"; alembic upgrade head'

for b in estoque_migrado estoque_sql; do
  docker compose exec -T db pg_dump -U estoque -d $b --schema-only --no-owner --no-privileges \
    --exclude-table=alembic_version | grep -Ev '^.(un)?restrict ' > $b.sql
done
diff estoque_migrado.sql estoque_sql.sql && echo IGUAIS
rm estoque_migrado.sql estoque_sql.sql
```

Sem nenhuma diferença, sai `IGUAIS`.
