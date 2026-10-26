# Regras de negócio — Estoque Inteligente

## Perfis e acesso
- RN-01: existem dois perfis: admin e operador.
- RN-02: só o admin acessa a área de usuários e faz ajustes de estoque.
- RN-03: o erro de login é sempre genérico, sem dizer se o e-mail ou a senha errou.

## Cadastros
- RN-04: o código de barras do produto é único.
- RN-05: o produto tem estoque mínimo, indica se controla validade e, se controlar, quantos dias de antecedência para o alerta.
- RN-06: no fornecedor só o nome é obrigatório; CNPJ é opcional.

## Movimentações
- RN-07: entrada e saída exigem quantidade maior que zero.
- RN-08: entrada de produto que controla validade exige a data de validade, e cada validade forma um lote.
- RN-09: a saída nunca pode deixar o saldo negativo.
- RN-10: a saída segue FEFO: sai primeiro do lote que vence antes.
- RN-11: ajuste de estoque exige motivo e fica registrado.
- RN-12: o histórico de movimentações é imutável: não se edita nem se apaga.

## Alertas
- RN-13: alerta de estoque baixo quando o saldo é igual ou menor que o mínimo.
- RN-14: alerta de vencimento próximo quando o lote vence dentro dos dias de antecedência.
- RN-15: alerta de vencido quando a validade já passou.
- RN-16: gerar alertas várias vezes não cria alertas repetidos.

## Dashboard
- RN-17: os números do dashboard devem ser iguais aos dados reais do estoque.

## Pontos a confirmar
- O operador pode cadastrar produtos e fornecedores, ou só o admin?
- Produto sem controle de validade tem um lote único ou só um saldo total?
- Como a saída escolhe entre lotes sem validade?