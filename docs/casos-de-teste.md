# Casos de Teste (versão simplificada) — Estoque Inteligente

**Dados usados nos testes:** um admin, um operador, o produto "Refrigerante 2L" (mínimo 10, controla validade, alerta 30 dias) e o produto "Detergente" (mínimo 5, sem validade).

## Login e permissões

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-01 | Entrar com e-mail e senha corretos | Acessa o sistema com as permissões do seu perfil | Erro de login ou perfil trocado |
| CT-02 | Entrar com senha errada | Acesso negado, com mensagem genérica | Entrar, ou a mensagem dizer qual campo errou |
| CT-03 | Operador tenta abrir a área de usuários | Acesso bloqueado | Tela de admin liberada |

## Cadastros

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-04 | Admin cadastra produto com dados válidos | Produto salvo e visível na lista | Erro ao salvar ou produto não aparece |
| CT-05 | Cadastrar produto com código de barras já existente | Sistema recusa e avisa | Produto duplicado é salvo |
| CT-06 | Cadastrar fornecedor só com o nome | Fornecedor salvo, sem pedir CNPJ | Sistema exige CNPJ |

## Entradas de estoque

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-07 | Dar entrada de 10 unidades pelo código de barras | Saldo aumenta em 10 e a entrada aparece no histórico | Saldo não muda ou histórico sem registro |
| CT-08 | Dar entrada com quantidade 0 ou negativa | Sistema recusa | Entrada é aceita |
| CT-09 | Dar entrada de produto com validade, sem informar a data | Sistema recusa e pede a data | Entrada é aceita sem validade |
| CT-27 | Dar segunda entrada com a mesma validade de um lote existente | Quantidade soma no mesmo lote, sem criar outro | Novo lote criado com a mesma validade |
| CT-28 | Dar entrada de produto sem validade | Quantidade soma no lote único do produto | Novo lote criado a cada entrada |
| CT-29 | Dar entrada com validade já vencida | Sistema recusa | Entrada é aceita com lote vencido |
| CT-30 | Dar entrada de produto sem validade informando uma validade | Sistema recusa | Entrada é aceita com validade |
| CT-31 | Tentar mudar "controla validade" de produto que já tem lotes | Sistema recusa | Campo alterado com lotes existentes |

## Saídas de estoque

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-10 | Dar saída de 3 unidades com saldo suficiente | Saldo diminui em 3 e a saída fica no histórico | Saldo errado ou sem registro |
| CT-11 | Dar saída maior que o saldo | Sistema recusa e o saldo continua igual | Saldo fica negativo |
| CT-12 | Saída de 8 un. com dois lotes: A (5 un., vence antes) e B (10 un.) | Lote A zera e o lote B fica com 7 | Sai do lote B primeiro |
| CT-32 | Dar saída de produto sem validade | Quantidade sai do lote único do produto | Saída recusada ou outro lote criado |
| CT-33 | Dar saída com um lote vencido que vem antes no FEFO | Saída usa só lotes dentro da validade; o vencido não muda | Saída retira do lote vencido |
| CT-34 | Dar saída que atinge dois lotes | Duas movimentações de saída, uma por lote | Uma só movimentação para os dois lotes |
| CT-35 | Dar saída com quantidade 0 ou negativa | Sistema recusa | Saída é aceita |
| CT-36 | Dar saída recusada por falta de saldo | Nenhum lote muda e nenhuma movimentação é criada | Lote alterado ou movimentação gravada |

## Ajustes e histórico

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-13 | Admin ajusta o estoque informando o motivo | Saldo corrigido e ajuste registrado | Ajuste sem registro |
| CT-14 | Ajustar estoque sem informar o motivo | Sistema recusa | Ajuste aceito sem motivo |
| CT-15 | Tentar editar ou apagar uma movimentação | Não é permitido | Histórico é alterado |
| CT-37 | Operador tenta fazer ajuste | Acesso bloqueado | Ajuste aceito |
| CT-38 | Ajuste com saldo contado igual ao atual | Sistema recusa | Ajuste sem diferença registrado |
| CT-39 | Ajuste com saldo contado 0 em lote vencido | Lote zerado e ajuste no histórico | Ajuste recusado por o lote estar vencido |
| CT-40 | Consultar o histórico após um ajuste | Mostra o saldo anterior, o saldo novo e o motivo | Ajuste sem saldos ou sem motivo |
| CT-41 | Tentar UPDATE ou DELETE em movimentações direto no banco | O banco recusa | Movimentação alterada ou apagada |

## Alertas

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-16 | Saldo fica igual ou abaixo do mínimo | Alerta de estoque baixo criado | Nenhum alerta |
| CT-17 | Lote vence dentro dos dias de antecedência | Alerta de vencimento próximo criado | Nenhum alerta |
| CT-18 | Lote com validade já passada | Alerta de vencido criado | Nenhum alerta |
| CT-19 | Rodar a geração de alertas duas vezes seguidas | Continua com um único alerta | Alertas repetidos |
| CT-42 | Estoque reposto acima do mínimo | Alerta de estoque baixo resolvido | Alerta continua ativo |
| CT-43 | Lote vencido baixado por ajuste | Alerta de vencido resolvido | Alerta continua ativo |
| CT-44 | Lote passa de próximo do vencimento para vencido | Alerta de vencimento próximo resolvido e alerta de vencido criado | Os dois ativos ou nenhuma troca |
| CT-45 | Condição volta depois de resolvida | Novo alerta ativo, e o resolvido continua no histórico | Nenhum alerta ou o antigo reaberto |
| CT-46 | Lote com quantidade zero | Nenhum alerta de validade para ele | Alerta de validade para lote zerado |
| CT-47 | Lote vencido no cálculo do estoque baixo | Lote vencido não conta para o saldo do alerta | Vencido evita o alerta de estoque baixo |

## Dashboard

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-20 | Abrir o dashboard após as movimentações | Números (produtos, estoque baixo, a vencer) iguais aos da lista de estoque | Números diferentes dos dados reais |
| CT-48 | Abrir a lista de estoque | Cada produto aparece com saldo físico, saldo disponível, mínimo e situação | Produto faltando ou sem algum desses dados |
| CT-49 | Lote vencido com quantidade | Conta no saldo físico e nos lotes vencidos, e não no saldo disponível | Vencido somado no saldo disponível ou fora dos lotes vencidos |
| CT-50 | Produto com saldo disponível zero | Conta em "sem estoque" e em "estoque baixo" | Fica fora de um dos dois |
| CT-51 | Abrir o dashboard sem nenhum produto | Todos os números zerados | Erro ou número diferente de zero |

## Cadastros: permissões e validações

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-21 | Operador cadastra produto e fornecedor | Produto e fornecedor salvos | Operador bloqueado ao cadastrar |
| CT-22 | Operador edita produto ou fornecedor | Alteração salva | Operador bloqueado ao editar |
| CT-23 | Tentar apagar produto ou fornecedor | A ação não existe e o registro continua salvo | Produto ou fornecedor é apagado |
| CT-24 | Cadastrar produto com fornecedor inexistente | Sistema recusa | Produto salvo com fornecedor que não existe |
| CT-25 | Cadastrar fornecedor com CNPJ repetido ou inválido | Sistema recusa e avisa | Fornecedor salvo com CNPJ duplicado ou inválido |
| CT-26 | Cadastrar produto que controla validade sem dias de alerta | Sistema recusa | Produto salvo sem dias de alerta |

## Leitura por código e situação dos lotes

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-52 | Buscar produto pelo código de barras exato (admin ou operador) | Devolve o produto com esse código; código inexistente ou só parecido devolve 404; sem login devolve 401 | Devolve outro produto com código parecido ou aceita sem login |
| CT-53 | Consultar o saldo de produto com lote vencido, lote a vencer e lote em dia | Cada lote vem com a situação vencido, a_vencer ou ok, pelas mesmas condições dos alertas e com o "hoje" de Brasília; vencer hoje é a_vencer | Situação diferente da usada nos alertas ou calculada no fuso UTC |

## Senhas e tentativas

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-54 | Fazer a 11ª tentativa de login no mesmo minuto, do mesmo IP | Sistema responde 429 "Muitas tentativas. Aguarde um minuto e tente de novo." | Tentativa processada normalmente |
| CT-55 | Trocar a senha informando a senha atual errada | Sistema recusa e a senha continua a mesma | Senha trocada |
| CT-56 | Trocar a senha e usar o token antigo | O token antigo deixa de valer (401) e a senha nova entra | Token antigo continua valendo ou a senha nova não entra |
| CT-57 | Admin define nova senha para um operador | O operador entra com a nova senha e o token antigo dele deixa de valer | Senha antiga continua entrando ou o token antigo vale |
| CT-58 | Admin tenta definir a própria senha pela rota de admin | Sistema recusa | Senha do admin trocada sem informar a senha atual |
| CT-59 | Operador tenta definir a senha de outro usuário | Acesso bloqueado (403) | Senha do outro usuário trocada |

## Banco de dados

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-60 | Com o usuário da aplicação, tentar UPDATE e DELETE no histórico (stock_movements) e desligar o trigger de imutabilidade | O banco recusa as três operações por falta de permissão | Histórico alterado, apagado ou trigger desligado |
| CT-61 | Com o usuário da aplicação, tentar criar uma tabela e alterar uma tabela existente | O banco recusa por falta de permissão | Tabela criada ou alterada |
| CT-62 | Duas entradas simultâneas no mesmo lote | O lote soma as duas quantidades e há duas entradas no histórico | Quantidade perdida ou lote duplicado |
| CT-63 | Duas saídas simultâneas que juntas passam do saldo | Uma é atendida e a outra recusada com 409; o saldo nunca fica negativo | As duas atendidas ou saldo negativo |
| CT-64 | Entrada e saída simultâneas no mesmo produto | O saldo final é o inicial + entrada − saída | Saldo final diferente |

## Listas paginadas

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-65 | Listar com mais itens que o limite (ex.: 60 produtos, limite padrão 50) | Devolve só 50 itens, com total 60; a página seguinte (deslocamento 50) traz os 10 restantes, sem repetir nenhum | Devolve todos os itens, total errado ou itens repetidos entre as páginas |
| CT-66 | Pedir uma lista com limite acima de 200 | Sistema recusa (422) | Lista devolvida com mais de 200 itens |
