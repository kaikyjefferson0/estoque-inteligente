# Regras de negócio — Estoque Inteligente

## Perfis e acesso
- RN-01: existem dois perfis: admin e operador.
- RN-02: só o admin acessa a área de usuários (listar, criar, editar, ativar e desativar) e faz ajustes de estoque. O operador não vê nem acessa essa área.
- RN-03: o erro de login é sempre genérico, sem dizer se o e-mail ou a senha errou.
- RN-18: todas as rotas da API, exceto o login e o health check, exigem usuário autenticado. Sem login, ninguém usa o sistema.
- RN-20: não existe auto-cadastro. Só o admin cria usuários, e o primeiro admin é criado por script no terminal.
- RN-21: usuário inativo não consegue entrar.
- RN-22: o admin não pode desativar a si mesmo nem mudar o próprio perfil, para o sistema nunca ficar sem admin.

## Cadastros
- RN-04: o código de barras do produto é único.
- RN-05: o produto tem estoque mínimo, indica se controla validade e, se controlar, quantos dias de antecedência para o alerta.
- RN-06: no fornecedor só o nome é obrigatório; CNPJ é opcional.
- RN-19: Admin e operador podem cadastrar e editar produtos e fornecedores.
- RN-23: produtos e fornecedores nunca são apagados (não existe exclusão).
- RN-24: cada produto pode ter um fornecedor (opcional), e esse fornecedor precisa existir.
- RN-25: o CNPJ, quando informado, tem 14 dígitos e é único.
- RN-26: se o produto controla validade, os dias de alerta são obrigatórios e maiores que zero; se não controla, ficam vazios.

## Movimentações
- RN-07: entrada e saída exigem quantidade maior que zero.
- RN-08: entrada de produto que controla validade exige a data de validade, e cada validade forma um lote.
- RN-09: a saída nunca pode deixar o saldo negativo.
- RN-10: a saída segue FEFO: sai primeiro do lote que vence antes.
- RN-11: ajuste de estoque exige motivo e fica registrado.
- RN-12: o histórico de movimentações é imutável: não se edita nem se apaga.
- RN-27: produto sem controle de validade tem um único lote, sem data de validade; toda entrada soma nesse lote e toda saída sai dele.
- RN-28: produto com controle de validade tem um lote por data de validade; uma nova entrada com a mesma validade soma no lote existente.
- RN-30: o campo "controla validade" de um produto não pode ser alterado depois que o produto tem algum lote.
- RN-31: a entrada não aceita validade já vencida; para produto sem controle de validade, a entrada não pode informar validade.
- RN-32: admin e operador registram entradas e saídas; só o admin faz ajustes (RN-02, RN-11).
- RN-36: a saída não usa lotes vencidos; o saldo disponível para saída é a soma dos lotes dentro da validade. O "hoje" segue o fuso America/Sao_Paulo, e um lote que vence hoje ainda pode sair.
- RN-37: um lote que chega a zero não é apagado, porque o histórico aponta para ele.

## Alertas
- RN-13: alerta de estoque baixo quando o saldo é igual ou menor que o mínimo.
- RN-14: alerta de vencimento próximo quando o lote vence dentro dos dias de antecedência.
- RN-15: alerta de vencido quando a validade já passou.
- RN-16: gerar alertas várias vezes não cria alertas repetidos.

## Dashboard
- RN-17: os números do dashboard devem ser iguais aos dados reais do estoque.

## Pontos a confirmar
- Ajuste de estoque: como indicar se ele aumenta ou diminui o saldo? (hoje a quantidade da movimentação é sempre maior que zero; decidir antes da Fase 6, parte B)
