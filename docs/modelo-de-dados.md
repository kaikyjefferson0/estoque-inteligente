# Modelo de dados

## users
id, nome, email (único), senha_hash, perfil (admin ou operador), ativo, criado_em, senha_alterada_em (vazio até a primeira troca de senha; tokens emitidos antes dela não valem, RN-48 e RN-49), demo (conta de demonstração, padrão falso; RN-53 e RN-55)
- CHECK ck_users_demo_operador: a conta de demonstração é sempre operador (RN-55).

## suppliers
id, nome, cnpj (opcional; único quando informado), criado_em
- Pode ser excluído só sem produtos vinculados (RN-59). A FK `fk_products_fornecedor_id_suppliers` (RESTRICT) garante isso no banco: a API transforma a recusa (23503) em 409 na exclusão e em 422 no cadastro ou na edição do produto (RN-24). Depois da exclusão, o CNPJ fica livre (RN-25).

## products
id, nome, codigo_barras (único, sem espaço em branco), estoque_minimo, controla_validade, dias_alerta_validade (opcional), fornecedor_id (opcional, referência a suppliers com RESTRICT), criado_em, preco (opcional, NUMERIC(10,2))
- preco: NUMERIC(10,2), nulo quando o produto não tem preço (RN-60). Valor exato, nunca float: até 99.999.999,99, com 2 casas. A API recebe e devolve como texto ("79.90"). Criada pela migration 30a97c4f4643 só com ADD COLUMN, sem preenchimento: os produtos cadastrados antes ficam sem preço. Não entra em nenhuma regra de estoque, nos alertas nem no painel.
- CHECK ck_products_preco_nao_negativo: `preco >= 0` (RN-60). NULL passa (sem preço); negativo é recusado mesmo num INSERT ou UPDATE feito fora da API.
- CHECK ck_products_dias_alerta_validade_maximo: `dias_alerta_validade <= 3650` (RN-26). NULL passa (produto que não controla validade). Criada pela migration 8f3454618767, que antes confere se algum produto já passa do teto e, se passar, para sem alterar nada. O mínimo e a coerência com controla_validade são da ck_products_dias_alerta_validade.
- CHECK ck_products_codigo_barras_sem_espacos: o código de barras não tem nenhum espaço em branco (RN-04). A condição lista os mesmos caracteres que a API tira (espaço, tabulação, quebras de linha, espaço inseparável e os outros espaços do Unicode), sem usar o `\s` do PostgreSQL, que depende do locale do banco. Criada pela migration 9a0c1c19b39f, depois de limpar os códigos já gravados.

## batches
id, produto_id, validade (opcional), quantidade, criado_em
- quantidade de zero a 2.147.483.647 (INTEGER); a entrada que passaria disso é recusada antes de gravar (RN-65).
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
- Chaves estrangeiras com RESTRICT: produto_id para products e (lote_id, produto_id) para batches (id, produto_id), para o lote ser do mesmo produto do alerta. Como todo produto nasce com o alerta de estoque baixo e alertas não são apagados (RN-39), o produto nunca pode ser excluído (RN-23); só o fornecedor tem exclusão (RN-59).

## demo_resets
id, recriado_em
- Data da última recriação dos dados de demonstração (RN-54). Nasce vazia a cada recriação e ganha uma linha no fim dela.
- Só o usuário dono lê e grava; o usuário da aplicação não tem nenhuma permissão nela (RN-50).

## Relações
- Um fornecedor tem vários produtos; um produto tem no máximo um fornecedor.
- Um produto tem vários lotes e várias movimentações.
- Um lote pertence a um produto.
- Uma movimentação é feita por um usuário.
