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

## Saídas de estoque

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-10 | Dar saída de 3 unidades com saldo suficiente | Saldo diminui em 3 e a saída fica no histórico | Saldo errado ou sem registro |
| CT-11 | Dar saída maior que o saldo | Sistema recusa e o saldo continua igual | Saldo fica negativo |
| CT-12 | Saída de 8 un. com dois lotes: A (5 un., vence antes) e B (10 un.) | Lote A zera e o lote B fica com 7 | Sai do lote B primeiro |

## Ajustes e histórico

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-13 | Admin ajusta o estoque informando o motivo | Saldo corrigido e ajuste registrado | Ajuste sem registro |
| CT-14 | Ajustar estoque sem informar o motivo | Sistema recusa | Ajuste aceito sem motivo |
| CT-15 | Tentar editar ou apagar uma movimentação | Não é permitido | Histórico é alterado |

## Alertas

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-16 | Saldo fica igual ou abaixo do mínimo | Alerta de estoque baixo criado | Nenhum alerta |
| CT-17 | Lote vence dentro dos dias de antecedência | Alerta de vencimento próximo criado | Nenhum alerta |
| CT-18 | Lote com validade já passada | Alerta de vencido criado | Nenhum alerta |
| CT-19 | Rodar a geração de alertas duas vezes seguidas | Continua com um único alerta | Alertas repetidos |

## Dashboard

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-20 | Abrir o dashboard após as movimentações | Números (produtos, estoque baixo, a vencer) iguais aos da lista de estoque | Números diferentes dos dados reais |

## Cadastros: permissões e validações

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-21 | Operador cadastra produto e fornecedor | Produto e fornecedor salvos | Operador bloqueado ao cadastrar |
| CT-22 | Operador tenta editar produto ou fornecedor | Edição bloqueada e dados continuam iguais | Operador consegue editar |
| CT-23 | Tentar apagar produto ou fornecedor | A ação não existe e o registro continua salvo | Produto ou fornecedor é apagado |
| CT-24 | Cadastrar produto com fornecedor inexistente | Sistema recusa | Produto salvo com fornecedor que não existe |
| CT-25 | Cadastrar fornecedor com CNPJ repetido ou inválido | Sistema recusa e avisa | Fornecedor salvo com CNPJ duplicado ou inválido |
| CT-26 | Cadastrar produto que controla validade sem dias de alerta | Sistema recusa | Produto salvo sem dias de alerta |
