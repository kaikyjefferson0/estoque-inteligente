# Regras de negócio — Estoque Inteligente

## Perfis e acesso
- RN-01: existem dois perfis: admin e operador.
- RN-02: só o admin acessa a área de usuários (listar, criar, editar, ativar e desativar) e faz ajustes de estoque. O operador não vê nem acessa essa área.
- RN-03: o erro de login é sempre genérico, sem dizer se o e-mail ou a senha errou.
- RN-18: todas as rotas da API, exceto o login e o health check, exigem usuário autenticado. Sem login, ninguém usa o sistema.
- RN-20: não existe auto-cadastro. Só o admin cria usuários, e o primeiro admin é criado por script no terminal.
- RN-21: usuário inativo não consegue entrar.
- RN-22: o admin não pode desativar a si mesmo nem mudar o próprio perfil, para o sistema nunca ficar sem admin.
- RN-47: o login aceita no máximo 10 tentativas por minuto por IP; acima disso responde 429 "Muitas tentativas. Aguarde um minuto e tente de novo." O IP vem do cabeçalho X-Forwarded-For quando a API está atrás de um proxy confiável (Render).
- RN-48: cada usuário pode trocar a própria senha informando a senha atual; a nova tem no mínimo 8 caracteres e precisa ser diferente da atual. A troca invalida todos os tokens emitidos antes dela.
- RN-49: o admin pode definir uma nova senha para outro usuário (não para si mesmo), o que também invalida os tokens desse usuário.

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
- RN-33: no ajuste, o admin informa o saldo contado de um lote e o motivo; o sistema calcula a diferença, atualiza o lote e registra a movimentação.
- RN-34: o ajuste guarda o saldo anterior e o saldo novo do lote e aparece no histórico do produto como as outras movimentações.
- RN-35: ajuste que não muda o saldo é recusado, e o saldo contado nunca pode ser negativo.
- RN-38: o ajuste também vale para lotes vencidos; contar 0 com o motivo "vencido" é a forma de dar baixa num lote vencido.

## Alertas
- RN-13: alerta de estoque baixo quando o saldo é igual ou menor que o mínimo.
- RN-14: alerta de vencimento próximo quando o lote vence dentro dos dias de antecedência.
- RN-15: alerta de vencido quando a validade já passou.
- RN-16: gerar alertas várias vezes não cria alertas repetidos.
- RN-39: quando a condição de um alerta deixa de existir, o alerta é marcado como resolvido, com data, e não é apagado. Se a condição voltar, nasce um alerta novo.
- RN-40: a geração de alertas roda depois de cada entrada, saída ou ajuste e ao cadastrar ou editar um produto, só para esse produto, e também por uma geração completa de todos os produtos.
- RN-41: o alerta de estoque baixo usa o saldo disponível (sem lotes vencidos).
- RN-42: lote com quantidade zero não gera alerta de validade; quando um lote vence, o alerta de vencimento próximo é resolvido e nasce o de vencido.
- RN-43: admin e operador veem os alertas.
- Nos alertas, o "hoje" segue o fuso America/Sao_Paulo, como nas RN-31 e RN-36.

## Dashboard
- RN-17: os números do dashboard devem ser iguais aos dados reais do estoque.
- RN-44: o dashboard e a lista de estoque calculam os números na hora, a partir dos lotes, usando as mesmas funções que decidem os alertas, para os três nunca discordarem. Exceção: o número de alertas ativos lê a tabela de alertas e reflete a última geração (RN-40); um lote que vence sem nenhuma movimentação só ganha o alerta na próxima geração completa.
- RN-45: o dashboard mostra: total de produtos, produtos com estoque baixo, produtos sem estoque (saldo disponível zero), lotes a vencer, lotes vencidos com quantidade, alertas ativos e as 5 últimas movimentações.
- RN-46: admin e operador veem o dashboard e a lista de estoque.

## Pontos a confirmar
- Nenhum no momento.
