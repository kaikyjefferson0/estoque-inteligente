-- Execute depois do seed, com ON_ERROR_STOP=1. Todas as escritas são desfeitas.
BEGIN;

DO $verificacao$
DECLARE
    ids INTEGER[];
    ids_fornecedores INTEGER[];
    fornecedor RECORD;
    produto RECORD;
    totais BIGINT[];
    caso RECORD;
    estado TEXT;
    restricao TEXT;
    coluna TEXT;
BEGIN
    SELECT array_agg(id ORDER BY id) INTO ids FROM estoque_aula.suppliers;
    IF ids IS DISTINCT FROM ARRAY[1, 2, 3] THEN
        RAISE EXCEPTION 'CT-V2-01: IDs dos fornecedores incorretos: %', ids;
    END IF;
    SELECT array_agg(id ORDER BY id) INTO ids FROM estoque_aula.products;
    IF ids IS DISTINCT FROM ARRAY[1, 2, 3, 4, 5, 6] THEN
        RAISE EXCEPTION 'CT-V2-01: IDs dos produtos incorretos: %', ids;
    END IF;
    RAISE NOTICE 'CT-V2-01 passou: seed com IDs, 3 fornecedores e 6 produtos';

    SELECT array_agg(s.id ORDER BY p.id) INTO ids_fornecedores
      FROM estoque_aula.products AS p
      LEFT JOIN estoque_aula.suppliers AS s ON s.id = p.fornecedor_id;
    IF ids_fornecedores IS DISTINCT FROM ARRAY[1, 1, 2, 2, NULL, NULL] THEN
        RAISE EXCEPTION 'CT-V2-02: relação produto/fornecedor incorreta: %', ids_fornecedores;
    END IF;
    RAISE NOTICE 'CT-V2-02 passou: LEFT JOIN preserva produtos sem fornecedor';

    SELECT array_agg(quantidade ORDER BY id) INTO totais
      FROM (
          SELECT s.id, count(p.id) AS quantidade
            FROM estoque_aula.suppliers AS s
            LEFT JOIN estoque_aula.products AS p ON p.fornecedor_id = s.id
           GROUP BY s.id
      ) AS por_fornecedor;
    IF totais IS DISTINCT FROM ARRAY[2, 2, 0]::BIGINT[] THEN
        RAISE EXCEPTION 'CT-V2-03: totais por fornecedor incorretos: %', totais;
    END IF;
    RAISE NOTICE 'CT-V2-03 passou: GROUP BY inclui fornecedor sem produtos';

    INSERT INTO estoque_aula.suppliers (nome)
    VALUES ('Fornecedor de teste')
    RETURNING id, cnpj INTO fornecedor;

    INSERT INTO estoque_aula.products (nome, codigo_barras)
    VALUES ('Produto de teste', repeat('9', 50))
    RETURNING id, estoque_minimo, controla_validade, dias_alerta_validade, fornecedor_id INTO produto;

    IF fornecedor.id < 100 OR fornecedor.cnpj IS NOT NULL OR produto.id < 100
       OR produto.estoque_minimo IS DISTINCT FROM 0 OR produto.controla_validade IS DISTINCT FROM FALSE
       OR produto.dias_alerta_validade IS NOT NULL OR produto.fornecedor_id IS NOT NULL THEN
        RAISE EXCEPTION 'CT-V2-04: valores padrão ou opcionais incorretos';
    END IF;
    RAISE NOTICE 'CT-V2-04 passou: IDs automáticos, código com 50 caracteres e valores padrão';

    -- Comandos fixos do teste. Cada bloco EXCEPTION desfaz a tentativa anterior.
    FOR caso IN
        SELECT * FROM (VALUES
            ('CT-V2-05', '23505', 'suppliers_pkey', '', $sql$INSERT INTO estoque_aula.suppliers (id, nome) VALUES (1, 'Duplicado')$sql$),
            ('CT-V2-06', '23505', 'products_pkey', '', $sql$INSERT INTO estoque_aula.products (id, nome, codigo_barras) VALUES (1, 'Duplicado', '990001')$sql$),
            ('CT-V2-07', '23505', 'uq_suppliers_cnpj', '', $sql$INSERT INTO estoque_aula.suppliers (nome, cnpj) VALUES ('Duplicado', '11222333000181')$sql$),
            ('CT-V2-08', '23505', 'ix_products_codigo_barras', '', $sql$INSERT INTO estoque_aula.products (nome, codigo_barras) VALUES ('Duplicado', '7891000000001')$sql$),
            ('CT-V2-09', '23514', 'ck_suppliers_cnpj_14_digitos', '', $sql$UPDATE estoque_aula.suppliers SET cnpj = '1234567890123' WHERE id = 2$sql$),
            ('CT-V2-10', '23514', 'ck_suppliers_cnpj_14_digitos', '', $sql$UPDATE estoque_aula.suppliers SET cnpj = '1234567890123A' WHERE id = 2$sql$),
            ('CT-V2-11', '23503', 'fk_products_fornecedor_id_suppliers', '', $sql$UPDATE estoque_aula.products SET fornecedor_id = 999 WHERE id = 1$sql$),
            ('CT-V2-12', '23503', 'fk_products_fornecedor_id_suppliers', '', $sql$DELETE FROM estoque_aula.suppliers WHERE id = 1$sql$),
            ('CT-V2-13', '23514', 'ck_products_estoque_minimo_nao_negativo', '', $sql$UPDATE estoque_aula.products SET estoque_minimo = -1 WHERE id = 3$sql$),
            ('CT-V2-14', '23514', 'ck_products_dias_alerta_validade', '', $sql$UPDATE estoque_aula.products SET dias_alerta_validade = NULL WHERE id = 2$sql$),
            ('CT-V2-15', '23514', 'ck_products_dias_alerta_validade', '', $sql$UPDATE estoque_aula.products SET dias_alerta_validade = 0 WHERE id = 2$sql$),
            ('CT-V2-16', '23514', 'ck_products_dias_alerta_validade', '', $sql$UPDATE estoque_aula.products SET dias_alerta_validade = 1 WHERE id = 3$sql$),
            ('CT-V2-17', '23514', 'ck_products_codigo_barras_sem_espacos', '', $sql$UPDATE estoque_aula.products SET codigo_barras = '990 001' WHERE id = 1$sql$),
            ('CT-V2-18', '23514', 'ck_products_codigo_barras_sem_espacos', '', $sql$UPDATE estoque_aula.products SET codigo_barras = E'990\t001' WHERE id = 1$sql$),
            ('CT-V2-19', '23514', 'ck_products_codigo_barras_sem_espacos', '', $sql$UPDATE estoque_aula.products SET codigo_barras = '990' || chr(160) || '001' WHERE id = 1$sql$),
            ('CT-V2-20', '23502', '', 'nome', $sql$INSERT INTO estoque_aula.suppliers (nome) VALUES (NULL)$sql$),
            ('CT-V2-21', '23502', '', 'nome', $sql$INSERT INTO estoque_aula.products (nome, codigo_barras) VALUES (NULL, '990001')$sql$),
            ('CT-V2-22', '23502', '', 'codigo_barras', $sql$INSERT INTO estoque_aula.products (nome, codigo_barras) VALUES ('Produto de teste', NULL)$sql$),
            ('CT-V2-23', '22001', '', '', $sql$INSERT INTO estoque_aula.products (nome, codigo_barras) VALUES ('Produto de teste', repeat('9', 51))$sql$),
            ('CT-V2-25', '23514', 'ck_products_dias_alerta_validade', '',
                $sql$UPDATE estoque_aula.products SET dias_alerta_validade = -1 WHERE id = 2$sql$)
        ) AS cenarios(id, estado_esperado, restricao_esperada, coluna_esperada, comando)
    LOOP
        BEGIN
            EXECUTE caso.comando;
        EXCEPTION WHEN integrity_constraint_violation OR string_data_right_truncation THEN
            GET STACKED DIAGNOSTICS
                estado = RETURNED_SQLSTATE, restricao = CONSTRAINT_NAME, coluna = COLUMN_NAME;
            IF (estado, restricao, coluna)
               IS DISTINCT FROM (caso.estado_esperado, caso.restricao_esperada, caso.coluna_esperada) THEN
                RAISE EXCEPTION '%: esperava (%, %, %), recebeu (%, %, %)',
                    caso.id, caso.estado_esperado, caso.restricao_esperada, caso.coluna_esperada,
                    estado, restricao, coluna;
            END IF;
            RAISE NOTICE '% passou: % % %', caso.id, estado, restricao, coluna;
            CONTINUE;
        END;
        RAISE EXCEPTION '%: o PostgreSQL aceitou um comando que deveria recusar', caso.id;
    END LOOP;
END;
$verificacao$;

ROLLBACK;
