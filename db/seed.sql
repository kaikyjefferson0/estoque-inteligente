-- =============================================================================
-- Estoque Inteligente: carga de dados de exemplo (PostgreSQL 18)
-- =============================================================================
--
-- Pode rodar quantas vezes quiser: começa apagando tudo, das tabelas filhas para as mães
-- (ordem das FKs), insere com IDs fixos e termina ajustando as sequências (setval).
-- Roda depois do db/postgres/01-schema.sql, com o usuário DONO das tabelas (estoque),
-- porque precisa desligar o trigger da RN-12 por um instante (veja o passo 1).
--
-- Uso: psql -U estoque -d <banco> -f db/seed.sql
--
-- Os dados exercitam as regras:
--   produto 1 Leite integral   lote que vence em 3 dias, com alerta de 7 dias: vencimento próximo (RN-14)
--                              e uma saída que saiu do lote que vence antes (FEFO, RN-10)
--   produto 2 Arroz branco     saldo 10 = estoque mínimo 10: no limite, já é estoque baixo (RN-13)
--   produto 3 Feijão carioca   entrou 20, saiu 20: sem estoque, lote zerado não é apagado (RN-37)
--   produto 5 Iogurte natural  um lote vencido há 2 dias (RN-15) e outro dentro da validade
--   produto 6 Detergente       ajuste de -2 com motivo e saldos anterior/novo (RN-33, RN-34)
--   produto 7 Sabonete         sem fornecedor (RN-24) e estoque mínimo 0
--   alerta 5                   estoque baixo já resolvido do Café: histórico de alertas (RN-39)
--
-- As datas de validade são relativas ao "hoje" de Brasília (RN-36), para o seed continuar
-- certo em qualquer dia em que rodar.
--
-- Os dois usuários NÃO conseguem fazer login: o senha_hash não é um hash Argon2 válido e a API
-- trata isso como senha errada. Eles existem porque toda movimentação tem um usuário (FK).
-- Para entrar no sistema, use o banco da aplicação, criado pelas migrations (não este).
-- =============================================================================

\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';

-- Tudo numa transação: se algo falhar, nada muda e o trigger continua ligado
BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Limpeza, das filhas para as mães
-- -----------------------------------------------------------------------------
-- RN-12: o histórico não aceita DELETE. Só para recriar os dados de exemplo, o trigger é
-- desligado DENTRO desta transação e religado logo depois do DELETE:
--   - o ALTER TABLE trava stock_movements (SHARE ROW EXCLUSIVE) até o COMMIT: outras conexões
--     ainda conseguem ler, mas nenhuma consegue gravar (INSERT, UPDATE ou DELETE) enquanto o
--     trigger está desligado. Elas esperam o COMMIT, e aí o trigger já voltou;
--   - se o seed falhar, o ROLLBACK desfaz o DISABLE e o trigger volta ligado;
--   - só o dono da tabela pode fazer isso. O usuário da API (estoque_app) não é dono e nem tem
--     DELETE em stock_movements (RN-50), então a regra não fica mais fraca para a aplicação.
DELETE FROM public.alerts;

ALTER TABLE public.stock_movements DISABLE TRIGGER trg_stock_movements_imutavel;
DELETE FROM public.stock_movements;
ALTER TABLE public.stock_movements ENABLE TRIGGER trg_stock_movements_imutavel;

DELETE FROM public.batches;
DELETE FROM public.products;
DELETE FROM public.suppliers;
DELETE FROM public.users;
DELETE FROM public.demo_resets;

-- -----------------------------------------------------------------------------
-- 2. Usuários (RN-01)
-- -----------------------------------------------------------------------------
INSERT INTO public.users (id, nome, email, senha_hash, perfil, ativo) VALUES
    (1, 'Ana Administradora', 'admin@exemplo.com.br',    'seed-sem-login', 'admin',    true),
    (2, 'Otávio Operador',    'operador@exemplo.com.br', 'seed-sem-login', 'operador', true);

-- -----------------------------------------------------------------------------
-- 3. Fornecedores (RN-06, RN-25: CNPJ opcional, 14 dígitos e único)
-- -----------------------------------------------------------------------------
INSERT INTO public.suppliers (id, nome, cnpj) VALUES
    (1, 'Laticínios Serra Azul',        '11222333000181'),
    (2, 'Distribuidora Grão de Ouro',   '44555666000172'),
    (3, 'Limpa Bem Produtos de Limpeza', NULL);

-- -----------------------------------------------------------------------------
-- 4. Produtos (RN-04, RN-05, RN-26; RN-60: preço em NUMERIC, e o Sabonete sem preço, NULL).
--    Um literal como 5.49 já é numeric exato no PostgreSQL, nunca float.
-- -----------------------------------------------------------------------------
INSERT INTO public.products
    (id, nome, codigo_barras, estoque_minimo, controla_validade, dias_alerta_validade, fornecedor_id, preco) VALUES
    (1, 'Leite integral 1 L',     '7890000000011', 10, true,  7,    1,     5.49),
    (2, 'Arroz branco 5 kg',      '7890000000028', 10, false, NULL, 2,    27.90),
    (3, 'Feijão carioca 1 kg',    '7890000000035',  5, false, NULL, 2,     8.99),
    (4, 'Café torrado 500 g',     '7890000000042',  5, false, NULL, 2,    32.90),
    (5, 'Iogurte natural 170 g',  '7890000000059',  6, true,  5,    1,     3.29),
    (6, 'Detergente neutro 500 ml','7890000000066', 8, false, NULL, 3,     2.59),
    (7, 'Sabonete 90 g',          '7890000000073',  0, false, NULL, NULL,  NULL),
    (8, 'Pão de forma 500 g',     '7890000000080',  4, true,  3,    NULL,  8.49);

-- -----------------------------------------------------------------------------
-- 5. Lotes (RN-27: sem validade, um lote só; RN-28: com validade, um lote por data)
--    quantidade = soma das movimentações do lote (passo 6)
-- -----------------------------------------------------------------------------
INSERT INTO public.batches (id, produto_id, validade, quantidade) VALUES
    -- Leite: vence em 3 dias, dentro dos 7 de alerta (vencimento próximo)
    ( 1, 1, (now() AT TIME ZONE 'America/Sao_Paulo')::date + 3,  12),
    ( 2, 1, (now() AT TIME ZONE 'America/Sao_Paulo')::date + 40, 24),
    ( 3, 2, NULL, 10),   -- Arroz: no limite do mínimo
    ( 4, 3, NULL,  0),   -- Feijão: sem estoque
    ( 5, 4, NULL, 30),   -- Café
    -- Iogurte: um lote vencido há 2 dias e outro bom
    ( 6, 5, (now() AT TIME ZONE 'America/Sao_Paulo')::date - 2,   4),
    ( 7, 5, (now() AT TIME ZONE 'America/Sao_Paulo')::date + 20, 15),
    ( 8, 6, NULL, 50),   -- Detergente: 52 de entrada, ajuste de -2
    ( 9, 7, NULL, 40),   -- Sabonete
    (10, 8, (now() AT TIME ZONE 'America/Sao_Paulo')::date + 10,  8);

-- -----------------------------------------------------------------------------
-- 6. Movimentações (RN-07, RN-10, RN-11, RN-34), em ordem cronológica
-- -----------------------------------------------------------------------------
INSERT INTO public.stock_movements
    (id, produto_id, lote_id, tipo, quantidade, motivo, usuario_id, saldo_anterior, saldo_novo, criado_em) VALUES
    ( 1, 1,  1, 'entrada', 20, NULL,                 2, NULL, NULL, now() - interval '12 days'),
    ( 2, 1,  2, 'entrada', 24, NULL,                 2, NULL, NULL, now() - interval '12 days'),
    ( 3, 2,  3, 'entrada', 10, NULL,                 2, NULL, NULL, now() - interval '11 days'),
    ( 4, 3,  4, 'entrada', 20, NULL,                 2, NULL, NULL, now() - interval '11 days'),
    ( 5, 4,  5, 'entrada', 30, NULL,                 2, NULL, NULL, now() - interval '10 days'),
    ( 6, 5,  6, 'entrada',  4, NULL,                 2, NULL, NULL, now() - interval '10 days'),
    ( 7, 5,  7, 'entrada', 15, NULL,                 2, NULL, NULL, now() - interval '9 days'),
    ( 8, 6,  8, 'entrada', 52, NULL,                 2, NULL, NULL, now() - interval '9 days'),
    ( 9, 7,  9, 'entrada', 40, NULL,                 2, NULL, NULL, now() - interval '8 days'),
    (10, 8, 10, 'entrada',  8, NULL,                 2, NULL, NULL, now() - interval '3 days'),
    -- FEFO: a saída de 8 leites saiu do lote 1, que vence antes do lote 2
    (11, 1,  1, 'saida',    8, NULL,                 2, NULL, NULL, now() - interval '5 days'),
    -- Feijão: saiu tudo
    (12, 3,  4, 'saida',   20, NULL,                 2, NULL, NULL, now() - interval '4 days'),
    -- Ajuste do admin: contou 50 onde havia 52 (quantidade = saldo_novo - saldo_anterior)
    (13, 6,  8, 'ajuste',  -2, 'Duas unidades avariadas', 1, 52, 50, now() - interval '2 days');

-- -----------------------------------------------------------------------------
-- 7. Alertas (RN-13 a RN-16, RN-39): os que a geração de alertas criaria hoje,
--    mais um resolvido
-- -----------------------------------------------------------------------------
INSERT INTO public.alerts (id, tipo, produto_id, lote_id, criado_em, resolvido_em) VALUES
    (1, 'vencimento_proximo', 1, 1,    now() - interval '1 day', NULL),
    (2, 'estoque_baixo',      2, NULL, now() - interval '1 day', NULL),
    (3, 'estoque_baixo',      3, NULL, now() - interval '4 days', NULL),
    (4, 'vencido',            5, 6,    now() - interval '1 day', NULL),
    -- Café ficou baixo antes de uma entrada (história anterior ao seed) e o alerta foi resolvido
    (5, 'estoque_baixo',      4, NULL, now() - interval '20 days', now() - interval '10 days');

-- -----------------------------------------------------------------------------
-- 8. Sequências: o próximo INSERT sem id continua depois do maior id do seed
--    (tabela vazia: o próximo id é 1)
-- -----------------------------------------------------------------------------
SELECT setval(pg_get_serial_sequence('public.users',           'id'), COALESCE(MAX(id), 0) + 1, false) FROM public.users;
SELECT setval(pg_get_serial_sequence('public.suppliers',       'id'), COALESCE(MAX(id), 0) + 1, false) FROM public.suppliers;
SELECT setval(pg_get_serial_sequence('public.products',        'id'), COALESCE(MAX(id), 0) + 1, false) FROM public.products;
SELECT setval(pg_get_serial_sequence('public.batches',         'id'), COALESCE(MAX(id), 0) + 1, false) FROM public.batches;
SELECT setval(pg_get_serial_sequence('public.stock_movements', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM public.stock_movements;
SELECT setval(pg_get_serial_sequence('public.alerts',          'id'), COALESCE(MAX(id), 0) + 1, false) FROM public.alerts;
SELECT setval(pg_get_serial_sequence('public.demo_resets',     'id'), COALESCE(MAX(id), 0) + 1, false) FROM public.demo_resets;

COMMIT;
