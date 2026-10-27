# Modelo de dados

## users
id, nome, email (único), senha_hash, perfil (admin ou operador), ativo, criado_em

## suppliers
id, nome, cnpj (opcional; único quando informado), criado_em

## products
id, nome, codigo_barras (único), estoque_minimo, controla_validade, dias_alerta_validade (opcional), fornecedor_id (opcional, referência a suppliers), criado_em

## batches
id, produto_id, validade (opcional), quantidade, criado_em

## stock_movements
id, produto_id, lote_id, tipo (entrada, saida ou ajuste), quantidade, motivo (obrigatório no ajuste), usuario_id, criado_em
- Só se inserem linhas novas, nunca se altera nem apaga.

## alerts
id, tipo (estoque_baixo, vencimento_proximo ou vencido), produto_id, lote_id (opcional), criado_em
- Restrição de unicidade por tipo + produto + lote, para não duplicar alertas.

## Relações
- Um fornecedor tem vários produtos; um produto tem no máximo um fornecedor.
- Um produto tem vários lotes e várias movimentações.
- Um lote pertence a um produto.
- Uma movimentação é feita por um usuário.
