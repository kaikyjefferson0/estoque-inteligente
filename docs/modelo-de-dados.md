# Modelo de dados

## users
id, nome, email (único), senha_hash, perfil (admin ou operador), ativo, criado_em

## suppliers
id, nome, cnpj (opcional; único quando informado), criado_em

## products
id, nome, codigo_barras (único), estoque_minimo, controla_validade, dias_alerta_validade (opcional), fornecedor_id (opcional, referência a suppliers), criado_em

## batches
id, produto_id, validade (opcional), quantidade, criado_em
- quantidade maior ou igual a zero.
- Um lote por produto + validade, valendo também para validade vazia (NULLS NOT DISTINCT): produto sem controle de validade tem um único lote sem validade (RN-27, RN-28).

## stock_movements
id, produto_id, lote_id, tipo (entrada, saida ou ajuste), quantidade, motivo (obrigatório no ajuste), saldo_anterior e saldo_novo (só no ajuste), usuario_id, criado_em
- Só se inserem linhas novas, nunca se altera nem apaga: um trigger no banco recusa UPDATE e DELETE (RN-12).
- tipo só entrada, saida ou ajuste; motivo obrigatório quando o tipo é ajuste.
- Em entrada e saída, quantidade maior que zero. No ajuste, quantidade é a diferença (saldo_novo - saldo_anterior), diferente de zero e podendo ser negativa.
- No ajuste, saldo_anterior e saldo_novo são obrigatórios e maiores ou iguais a zero (RN-34, RN-35).
- Uma saída que consome vários lotes (FEFO) gera uma movimentação por lote.
- O lote pertence ao mesmo produto da movimentação: chave estrangeira composta (lote_id, produto_id) para batches (id, produto_id).

## alerts
id, tipo (estoque_baixo, vencimento_proximo ou vencido), produto_id, lote_id (opcional), criado_em, resolvido_em (opcional)
- tipo só estoque_baixo, vencimento_proximo ou vencido.
- lote_id vazio no estoque_baixo e obrigatório nos alertas de validade.
- Alerta ativo é o que tem resolvido_em vazio; o resolvido não é apagado (RN-39).
- Unicidade de tipo + produto_id + lote_id só entre os ativos: índice único parcial (WHERE resolvido_em IS NULL) com NULLS NOT DISTINCT, para o estoque_baixo (lote vazio) também não duplicar (RN-16).
- Chaves estrangeiras com RESTRICT: produto_id para products e (lote_id, produto_id) para batches (id, produto_id), para o lote ser do mesmo produto do alerta.

## Relações
- Um fornecedor tem vários produtos; um produto tem no máximo um fornecedor.
- Um produto tem vários lotes e várias movimentações.
- Um lote pertence a um produto.
- Uma movimentação é feita por um usuário.
