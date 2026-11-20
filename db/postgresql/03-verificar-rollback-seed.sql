-- CT-V2-26. Execute com psql depois do esquema e do seed no banco da aula.
\set ON_ERROR_STOP on

BEGIN;

-- Registros fora do seed tornam detectável uma restauração só parcial.
INSERT INTO estoque_aula.suppliers (id, nome) VALUES (90, 'Fornecedor antes da falha');
INSERT INTO estoque_aula.products (id, nome, codigo_barras, fornecedor_id)
VALUES (90, 'Produto antes da falha', '9000000000000', 90);

CREATE TEMP TABLE fornecedores_antes ON COMMIT DROP AS TABLE estoque_aula.suppliers;
CREATE TEMP TABLE produtos_antes ON COMMIT DROP AS TABLE estoque_aula.products;

SAVEPOINT antes_do_seed;

-- Falha apenas quando o seed tenta reinserir o produto 6. Até lá, os
-- DELETEs e o INSERT dos fornecedores já passaram.
ALTER TABLE estoque_aula.products
    ADD CONSTRAINT ck_teste_seed_recusa_produto_6 CHECK (id <> 6) NOT VALID;

\set ON_ERROR_STOP off
\ir ../seed.sql
\set seed_sqlstate :SQLSTATE
\set ON_ERROR_STOP on

ROLLBACK TO SAVEPOINT antes_do_seed;

SELECT :'seed_sqlstate' = '23514' AS seed_falhou_no_check \gset
\if :seed_falhou_no_check
\else
    \echo CT-V2-26 esperava SQLSTATE 23514 e recebeu :seed_sqlstate
    DO $$ BEGIN RAISE EXCEPTION 'CT-V2-26: falha esperada do seed não ocorreu'; END; $$;
\endif

DO $verificacao$
BEGIN
    IF (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM estoque_aula.suppliers AS s)
       IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id) FROM fornecedores_antes AS s)
       OR (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM estoque_aula.products AS p)
       IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM produtos_antes AS p) THEN
        RAISE EXCEPTION 'CT-V2-26: o rollback não restaurou as duas tabelas';
    END IF;
    RAISE NOTICE 'CT-V2-26 passou: rollback restaurou os fornecedores e produtos anteriores';
END;
$verificacao$;

ROLLBACK;
