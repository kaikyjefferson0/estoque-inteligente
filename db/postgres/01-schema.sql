-- =============================================================================
-- Estoque Inteligente: esquema do banco (PostgreSQL 18)
-- =============================================================================
--
-- Fonte oficial do esquema: as migrations do Alembic (backend\alembic\versions).
-- Este arquivo é uma cópia legível do banco migrado até a revisão 9a0c1c19b39f (head),
-- gerada com `pg_dump --schema-only --no-owner --no-privileges` e reorganizada à mão:
-- as restrições foram para dentro do CREATE TABLE e as tabelas seguem a ordem das FKs.
-- O banco criado por este script é igual ao das migrations (veja db\README.md, "Prova").
--
-- Ficou de fora, de propósito:
--   - alembic_version: tabela do próprio Alembic (marca a revisão aplicada);
--   - dono das tabelas, GRANT e REVOKE: dependem do ambiente. Na aplicação, o usuário da API
--     (estoque_app) recebe as permissões pela migration 5ce5fb9fdbd0 e pelo
--     app.scripts.sincronizar_permissoes (RN-50 e RN-58).
--
-- Nomes das restrições: fk_ (chave estrangeira), uq_ (única) e ck_ (CHECK). As chaves primárias
-- e os dois índices únicos ix_users_email e ix_products_codigo_barras mantêm o nome que o
-- Alembic criou (tabela_pkey e ix_), para o script continuar igual ao banco.
--
-- Uso (banco vazio): psql -U estoque -d <banco> -f db/postgres/01-schema.sql
-- Roda numa transação só: se qualquer comando falhar, nada fica criado.
-- =============================================================================

\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';  -- a CHECK do código de barras e as mensagens têm caracteres Unicode

BEGIN;

-- -----------------------------------------------------------------------------
-- users: quem usa o sistema (RN-01: perfis admin e operador)
-- -----------------------------------------------------------------------------
CREATE TABLE public.users (
    id                 serial                   NOT NULL,
    nome               character varying(120)   NOT NULL,
    email              character varying(255)   NOT NULL,
    senha_hash         character varying(255)   NOT NULL,  -- hash Argon2, nunca a senha
    perfil             character varying(20)    NOT NULL,
    ativo              boolean                  DEFAULT true NOT NULL,
    criado_em          timestamp with time zone DEFAULT now() NOT NULL,
    senha_alterada_em  timestamp with time zone,
    demo               boolean                  DEFAULT false NOT NULL,  -- RN-53: conta de demonstração

    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT ck_users_perfil CHECK (perfil IN ('admin', 'operador')),
    -- o e-mail é guardado em minúsculas, para o índice único valer sem diferenciar maiúsculas
    CONSTRAINT ck_users_email_minusculo CHECK (email = lower(email)),
    -- RN-55: a conta de demonstração é sempre operador
    CONSTRAINT ck_users_demo_operador CHECK (NOT demo OR perfil = 'operador')
);

-- e-mail único (índice único criado pelo Alembic com index=True, unique=True)
CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);

-- -----------------------------------------------------------------------------
-- suppliers: fornecedores (RN-06: só o nome é obrigatório)
-- -----------------------------------------------------------------------------
CREATE TABLE public.suppliers (
    id         serial                   NOT NULL,
    nome       character varying(120)   NOT NULL,
    cnpj       character varying(14),            -- opcional; só dígitos
    criado_em  timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT suppliers_pkey PRIMARY KEY (id),
    -- RN-25: quando informado, o CNPJ tem 14 dígitos e é único (NULL pode repetir)
    CONSTRAINT uq_suppliers_cnpj UNIQUE (cnpj),
    CONSTRAINT ck_suppliers_cnpj_14_digitos CHECK (cnpj ~ '^[0-9]{14}$')
);

-- -----------------------------------------------------------------------------
-- products: produtos (RN-05, RN-23: nunca são apagados)
-- -----------------------------------------------------------------------------
CREATE TABLE public.products (
    id                    serial                   NOT NULL,
    nome                  character varying(120)   NOT NULL,
    codigo_barras         character varying(50)    NOT NULL,
    estoque_minimo        integer                  DEFAULT 0 NOT NULL,
    controla_validade     boolean                  DEFAULT false NOT NULL,
    dias_alerta_validade  integer,                 -- antecedência do alerta de vencimento (RN-14)
    fornecedor_id         integer,                 -- RN-24: opcional
    criado_em             timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT ck_products_estoque_minimo_nao_negativo CHECK (estoque_minimo >= 0),
    -- RN-26: controla validade => dias obrigatórios e > 0; não controla => dias vazios
    CONSTRAINT ck_products_dias_alerta_validade CHECK (
        (controla_validade AND dias_alerta_validade IS NOT NULL AND dias_alerta_validade > 0)
        OR (NOT controla_validade AND dias_alerta_validade IS NULL)
    ),
    -- RN-04: o código de barras nunca tem espaço em branco. A lista tem, um a um, os caracteres
    -- que o str.split() do Python trata como espaço (tabulação, quebra de linha, espaço
    -- inseparável U+00A0, U+2000 a U+200A, U+3000...), escritos literalmente entre os colchetes.
    -- Não use \s: ele depende do locale do banco e não pega o U+00A0.
    CONSTRAINT ck_products_codigo_barras_sem_espacos
        CHECK (((codigo_barras)::text !~ '[\u0009-\u000d\u001c- \u0085   -     　]'::text)),
    CONSTRAINT fk_products_fornecedor_id_suppliers FOREIGN KEY (fornecedor_id)
        REFERENCES public.suppliers (id) ON DELETE RESTRICT
);

-- RN-04: código de barras único (índice único criado pelo Alembic com index=True, unique=True)
CREATE UNIQUE INDEX ix_products_codigo_barras ON public.products USING btree (codigo_barras);
CREATE INDEX ix_products_fornecedor_id ON public.products USING btree (fornecedor_id);

-- -----------------------------------------------------------------------------
-- batches: lotes de um produto (RN-27, RN-28: um lote por validade)
-- -----------------------------------------------------------------------------
CREATE TABLE public.batches (
    id          serial                   NOT NULL,
    produto_id  integer                  NOT NULL,
    validade    date,                              -- NULL no produto que não controla validade
    quantidade  integer                  DEFAULT 0 NOT NULL,  -- saldo atual do lote
    criado_em   timestamp with time zone DEFAULT now() NOT NULL,

    CONSTRAINT batches_pkey PRIMARY KEY (id),
    -- RN-09: o saldo do lote nunca fica negativo
    CONSTRAINT ck_batches_quantidade_nao_negativa CHECK (quantidade >= 0),
    -- RN-27/RN-28: um lote por (produto, validade); NULLS NOT DISTINCT faz o lote sem
    -- validade ser único por produto (sem isso, dois NULL contariam como diferentes)
    CONSTRAINT uq_batches_produto_id_validade UNIQUE NULLS NOT DISTINCT (produto_id, validade),
    -- alvo das FKs compostas de stock_movements e alerts: o lote pertence àquele produto
    CONSTRAINT uq_batches_id_produto_id UNIQUE (id, produto_id),
    CONSTRAINT fk_batches_produto_id_products FOREIGN KEY (produto_id)
        REFERENCES public.products (id) ON DELETE RESTRICT
);

-- -----------------------------------------------------------------------------
-- stock_movements: histórico de entradas, saídas e ajustes (RN-12: imutável)
-- -----------------------------------------------------------------------------
CREATE TABLE public.stock_movements (
    id              serial                   NOT NULL,
    produto_id      integer                  NOT NULL,
    lote_id         integer                  NOT NULL,
    tipo            character varying(20)    NOT NULL,
    quantidade      integer                  NOT NULL,  -- no ajuste, a diferença (pode ser negativa)
    motivo          character varying(255),
    usuario_id      integer                  NOT NULL,
    criado_em       timestamp with time zone DEFAULT now() NOT NULL,
    saldo_anterior  integer,                            -- RN-34: só no ajuste
    saldo_novo      integer,                            -- RN-34: só no ajuste

    CONSTRAINT stock_movements_pkey PRIMARY KEY (id),
    CONSTRAINT ck_stock_movements_tipo CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
    -- RN-07 e RN-35: entrada e saída > 0; ajuste é a diferença, diferente de zero
    CONSTRAINT ck_stock_movements_quantidade CHECK (
        (tipo = 'ajuste' AND quantidade <> 0) OR (tipo <> 'ajuste' AND quantidade > 0)
    ),
    -- RN-11: ajuste exige motivo não vazio
    CONSTRAINT ck_stock_movements_motivo_ajuste CHECK (
        tipo <> 'ajuste' OR (motivo IS NOT NULL AND btrim(motivo) <> '')
    ),
    -- RN-34/RN-35: no ajuste, saldos obrigatórios, não negativos e coerentes com a diferença
    CONSTRAINT ck_stock_movements_saldos_ajuste CHECK (
        tipo <> 'ajuste' OR (
            saldo_anterior IS NOT NULL AND saldo_novo IS NOT NULL
            AND saldo_anterior >= 0 AND saldo_novo >= 0
            AND saldo_novo - saldo_anterior = quantidade
        )
    ),
    CONSTRAINT fk_stock_movements_produto_id_products FOREIGN KEY (produto_id)
        REFERENCES public.products (id) ON DELETE RESTRICT,
    -- FK composta: o lote precisa ser do mesmo produto da movimentação
    CONSTRAINT fk_stock_movements_lote_id_produto_id_batches FOREIGN KEY (lote_id, produto_id)
        REFERENCES public.batches (id, produto_id) ON DELETE RESTRICT,
    CONSTRAINT fk_stock_movements_usuario_id_users FOREIGN KEY (usuario_id)
        REFERENCES public.users (id) ON DELETE RESTRICT
);

CREATE INDEX ix_stock_movements_lote_id ON public.stock_movements USING btree (lote_id);
CREATE INDEX ix_stock_movements_produto_id ON public.stock_movements USING btree (produto_id);
CREATE INDEX ix_stock_movements_usuario_id ON public.stock_movements USING btree (usuario_id);

-- RN-12: o banco recusa UPDATE e DELETE no histórico, mesmo fora da API.
-- Para corrigir o estoque, registra-se um ajuste (RN-33).
CREATE FUNCTION public.stock_movements_imutavel() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
            RAISE EXCEPTION 'stock_movements é imutável (RN-12): % não é permitido', TG_OP
                USING HINT = 'Para corrigir o estoque, registre um ajuste.';
        END;
        $$;

CREATE TRIGGER trg_stock_movements_imutavel
    BEFORE DELETE OR UPDATE ON public.stock_movements
    FOR EACH STATEMENT EXECUTE FUNCTION public.stock_movements_imutavel();

-- -----------------------------------------------------------------------------
-- alerts: alertas de estoque baixo, vencimento próximo e vencido (RN-13 a RN-16)
-- -----------------------------------------------------------------------------
CREATE TABLE public.alerts (
    id            serial                   NOT NULL,
    tipo          character varying(20)    NOT NULL,
    produto_id    integer                  NOT NULL,
    lote_id       integer,                           -- vazio no estoque_baixo (vale para o produto)
    criado_em     timestamp with time zone DEFAULT now() NOT NULL,
    resolvido_em  timestamp with time zone,          -- RN-39: NULL = ativo; resolvidos não são apagados

    CONSTRAINT alerts_pkey PRIMARY KEY (id),
    CONSTRAINT ck_alerts_tipo CHECK (tipo IN ('estoque_baixo', 'vencimento_proximo', 'vencido')),
    -- estoque_baixo é do produto (sem lote); os de validade são de um lote
    CONSTRAINT ck_alerts_lote_por_tipo CHECK (
        (tipo = 'estoque_baixo' AND lote_id IS NULL) OR (tipo <> 'estoque_baixo' AND lote_id IS NOT NULL)
    ),
    CONSTRAINT fk_alerts_produto_id_products FOREIGN KEY (produto_id)
        REFERENCES public.products (id) ON DELETE RESTRICT,
    CONSTRAINT fk_alerts_lote_id_produto_id_batches FOREIGN KEY (lote_id, produto_id)
        REFERENCES public.batches (id, produto_id) ON DELETE RESTRICT
);

CREATE INDEX ix_alerts_produto_id ON public.alerts USING btree (produto_id);
-- RN-16: um só alerta ATIVO por tipo + produto + lote. Índice único parcial (os resolvidos ficam
-- fora, RN-39) e NULLS NOT DISTINCT para o estoque_baixo, que não tem lote.
CREATE UNIQUE INDEX uq_alerts_ativo_tipo_produto_id_lote_id ON public.alerts
    USING btree (tipo, produto_id, lote_id) NULLS NOT DISTINCT
    WHERE (resolvido_em IS NULL);

-- -----------------------------------------------------------------------------
-- demo_resets: data de cada recriação dos dados de demonstração (RN-54)
-- -----------------------------------------------------------------------------
CREATE TABLE public.demo_resets (
    id           serial                   NOT NULL,
    recriado_em  timestamp with time zone NOT NULL,

    CONSTRAINT demo_resets_pkey PRIMARY KEY (id)
);

COMMIT;
