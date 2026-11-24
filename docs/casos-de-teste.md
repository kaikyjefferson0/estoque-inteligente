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
| CT-101 | Dar entrada que deixa o lote exatamente em 2147483647; depois, uma que passaria disso (lote com 2000000000, com 2147483646 e já cheio; produto com e sem validade); e duas entradas simultâneas de 2000000000 no mesmo lote. Regra: [RN-65](regras-negocio.md) | A primeira é aceita; as outras são recusadas com 422 dizendo quanto ainda cabe no lote, sem gravar lote, movimentação nem alerta; das simultâneas, uma é aceita e a outra recusada; outra validade continua aceitando, e uma saída abre espaço no lote | Erro do servidor (500), lote acima do máximo ou movimentação gravada na entrada recusada |
| CT-102 | Levar ao extremo as outras contas: ajuste de 2147483647 para 0 e de volta; saldo contado e saída de 2147483648; produto com dois lotes cheios e estoque mínimo 2147483647 (detalhe, lista de estoque, painel, alertas, saída por dois lotes e lotes vencidos); e números como 1e400, NaN e um de 5000 dígitos, e validades como "0000-01-01" e 10000-01-01, no JSON. Regra: [RN-65](regras-negocio.md) | Dentro do limite, tudo é aceito, e o saldo do produto aparece certo mesmo acima de 2147483647; fora dele, 422 (ou 400, se o número do JSON não puder ser lido) e nada gravado | Erro do servidor (500), saldo errado ou gravação parcial |

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
| CT-23 | Tentar apagar produto (admin ou operador). Regra: [RN-23](regras-negocio.md) | A ação não existe (405) e o produto continua salvo | Produto é apagado |
| CT-24 | Cadastrar ou editar produto com fornecedor inexistente, inclusive quando o fornecedor é excluído entre a conferência e a gravação (o banco recusa pela FK). Regras: [RN-24 e RN-59](regras-negocio.md) | Sistema recusa (422) com a mensagem de fornecedor inexistente | Produto salvo com fornecedor que não existe, ou erro 500 |
| CT-25 | Cadastrar fornecedor com CNPJ repetido ou inválido | Sistema recusa e avisa | Fornecedor salvo com CNPJ duplicado ou inválido |
| CT-26 | Cadastrar produto que controla validade sem dias de alerta | Sistema recusa | Produto salvo sem dias de alerta |
| CT-99 | Cadastrar e editar produto com 0, 1, 3650, 3651 e 2147483647 dias de alerta (e também negativo e acima do INTEGER), pela API e pela tela. Regra: [RN-26](regras-negocio.md) | 1 e 3650 são aceitos, e os alertas são gerados até com a maior validade possível; os outros são recusados com 422 no campo, com o limite na mensagem, e nada é gravado; a tela mostra o limite na dica e no erro, sem enviar | Erro do servidor (500), produto salvo fora da faixa ou mensagem sem o limite |

## Produtos: preço

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-91 | Cadastrar e editar produto com preço -0,01, 0, 0,01, 99.999.999,99, 100.000.000,00, com 3 casas decimais ("12.345", "12.340"), sem preço (`null` ou sem o campo), com texto inválido ("12,50", "1e2", " 5 ") e como número no JSON (12.5 sem aspas, e 12.5000000000000001); depois, apagar o preço na edição (`null`). Regra: [RN-60](regras-negocio.md) | 0, 0,01, 99.999.999,99 e sem preço são aceitos (201/200); -0,01, 100.000.000,00, 3 casas, texto inválido e número no JSON são recusados (422) sem salvar nada; a API devolve o preço como texto com 2 casas ("79.90") na lista, no detalhe e na busca por código, ou `null` quando não há; `null` na edição apaga o preço | Preço negativo, acima do limite ou com 3 casas salvo; preço devolvido como número; edição recusada que altera outro campo |
| CT-92 | Gravar direto no banco (fora da API) um preço negativo, num INSERT e num UPDATE; gravar 100.000.000,00; somar no banco os preços 0,10 e 0,20. Regra: [RN-60](regras-negocio.md) | Negativo recusado pela CHECK ck_products_preco_nao_negativo; 100.000.000,00 recusado pelo limite do NUMERIC(10,2); a soma dá exatamente 0,30 | Banco aceitando preço negativo ou acima do limite; soma diferente de 0,30 (erro de ponto flutuante) |
| CT-93 | Aplicar a migration do preço num banco com produtos já cadastrados, desfazer (downgrade) e aplicar de novo. Regra: [RN-60](regras-negocio.md) | O upgrade cria a coluna `preco` NUMERIC(10,2) nula e a CHECK, e os produtos antigos ficam sem preço (nenhum preenchimento); o downgrade remove a coluna e a CHECK | Coluna obrigatória, preço preenchido sozinho, outro campo alterado ou downgrade que deixa a coluna ou a CHECK |
| CT-94 | Na tela, digitar o preço no formato brasileiro (12,50; 1.234,56; 12.5; vazio; -1; 12,345; 12.345 sem vírgula) ao cadastrar e editar, e ver o preço na lista e no detalhe. Regra: [RN-60](regras-negocio.md) | "12,50" é enviado como "12.50" e "1.234,56" como "1234.56", sem passar por número de ponto flutuante; vazio envia `null` (apaga o preço na edição); negativo, 3 casas e o ambíguo "12.345" mostram o erro no campo, sem enviar; na edição, o preço salvo aparece como na lista ("1.234,50") e o mesmo valor escrito de outro jeito não é reenviado; a lista e o detalhe mostram "R$ 1.234,50" (alinhado como os outros números) e, sem preço, "Sem preço" em texto suave, como o "Sem fornecedor" (no celular, a etiqueta é só "Sem preço", sem o rótulo "Preço" na frente) | Preço enviado com vírgula ou arredondado, formulário enviado com preço inválido, ou lista mostrando "null", "NaN", "R$ 0,00" ou "Preço Sem preço" para produto sem preço |

## Fornecedores: exclusão e substituição

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-85 | Admin exclui um fornecedor sem produtos, pela API e pelo botão "Excluir" da lista, depois de confirmar no diálogo. Regra: [RN-59](regras-negocio.md) | Responde 204; o fornecedor some da lista e o GET dele devolve 404; na tela aparece "Fornecedor excluído" | Fornecedor continua salvo, ou é apagado sem a confirmação |
| CT-86 | Excluir um fornecedor com produtos vinculados, e também quando um produto é ligado a ele depois da conferência (o banco recusa pela FK). Regra: [RN-59](regras-negocio.md) | Responde 409 "Este fornecedor tem N produto(s) vinculado(s) e não pode ser excluído." com o número certo; o fornecedor e os produtos continuam iguais; na tela, a mensagem aparece num aviso e a lista continua visível | Fornecedor apagado, produto sem fornecedor, erro 500 ou tela quebrada |
| CT-87 | Excluir (DELETE) ou substituir (PUT) um fornecedor que não existe. Regras: [RN-59 e RN-19](regras-negocio.md) | Responde 404 "Fornecedor não encontrado. Ele pode ter sido removido; atualize a página." (a mesma mensagem do GET e do PATCH) | Responde 204 ou 200, ou cria um fornecedor |
| CT-88 | Operador tenta excluir um fornecedor, com e sem produtos; na tela, o operador abre a lista de fornecedores. Regra: [RN-59](regras-negocio.md) | Responde 403 e o fornecedor continua salvo; o botão "Excluir" não aparece para o operador (só para o admin) | Fornecedor apagado ou botão visível para o operador |
| CT-89 | Substituir um fornecedor pelo PUT (admin e operador) com nome e CNPJ, com `cnpj: null`, sem a chave `cnpj` ou `nome`, e com CNPJ inválido; e salvar a edição pela tela, que usa o PUT. Regras: [RN-19, RN-06 e RN-25](regras-negocio.md) | Com o corpo completo, responde 200 e grava os dois campos (com `cnpj: null`, fica sem CNPJ); chave faltando ou CNPJ inválido, 422 sem alterar nada; a tela envia PUT com o fornecedor completo (CNPJ vazio vai como `null`) e a lista mostra o nome novo | Fornecedor alterado em parte, campo ausente aceito, CNPJ inválido gravado, ou a tela usando PATCH |
| CT-90 | Substituir um fornecedor pelo PUT com o CNPJ de outro fornecedor (com ou sem pontuação). Regras: [RN-19 e RN-25](regras-negocio.md) | Responde 409 "Este CNPJ já está cadastrado em outro fornecedor. Confira o número." e o fornecedor continua como estava | CNPJ duplicado gravado ou nome alterado mesmo com o erro |

## Leitura por código e situação dos lotes

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-52 | Buscar produto pelo código de barras exato (admin ou operador) | Devolve o produto com esse código; código inexistente ou só parecido devolve 404; sem login devolve 401 | Devolve outro produto com código parecido ou aceita sem login |
| CT-53 | Consultar o saldo de produto com lote vencido, lote a vencer e lote em dia | Cada lote vem com a situação vencido, a_vencer ou ok, pelas mesmas condições dos alertas e com o "hoje" de Brasília; vencer hoje é a_vencer | Situação diferente da usada nos alertas ou calculada no fuso UTC |
| CT-82 | Usar o código de barras com espaços no meio (espaço, quebra de linha ou espaço inseparável, como ao copiar "3037 3543" da tela) no cadastro, na edição, na busca exata, na entrada e na saída; e copiar o código mostrado na lista de Produtos e colar na busca da Entrada. Regra: [RN-04](regras-negocio.md) | Os espaços são ignorados: o produto é salvo só com os dígitos, a busca, a entrada e a saída encontram o produto, e o mesmo código com outros espaços conta como repetido (409); só espaços é código vazio (422). O código copiado da lista vai para a área de transferência só com os dígitos e, colado na Entrada, encontra o produto | Código salvo com espaço, busca com 404, entrada ou saída recusada, o mesmo código aceito duas vezes, ou cópia com espaço ou quebra de linha entre os grupos |

## Senhas e tentativas

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-54 | Fazer a 11ª tentativa de login no mesmo minuto, do mesmo IP | Sistema responde 429 "Muitas tentativas. Aguarde um minuto e tente de novo." | Tentativa processada normalmente |
| CT-55 | Trocar a senha informando a senha atual errada | Sistema recusa e a senha continua a mesma | Senha trocada |
| CT-56 | Trocar a senha e usar o token antigo | O token antigo deixa de valer (401) e a senha nova entra | Token antigo continua valendo ou a senha nova não entra |
| CT-57 | Admin define nova senha para um operador | O operador entra com a nova senha e o token antigo dele deixa de valer | Senha antiga continua entrando ou o token antigo vale |
| CT-58 | Admin tenta definir a própria senha pela rota de admin | Sistema recusa | Senha do admin trocada sem informar a senha atual |
| CT-59 | Operador tenta definir a senha de outro usuário | Acesso bloqueado (403) | Senha do outro usuário trocada |
| CT-67 | Fazer a 6ª tentativa de troca de senha no mesmo minuto, com o mesmo usuário (mesmo com a senha atual certa) | Sistema responde 429 "Muitas tentativas. Aguarde um minuto e tente de novo." e a senha continua a mesma | Troca processada normalmente |

## Banco de dados

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-60 | Com o usuário da aplicação, tentar UPDATE e DELETE no histórico (stock_movements) e desligar o trigger de imutabilidade | O banco recusa as três operações por falta de permissão | Histórico alterado, apagado ou trigger desligado |
| CT-61 | Com o usuário da aplicação, tentar criar uma tabela e alterar uma tabela existente | O banco recusa por falta de permissão | Tabela criada ou alterada |
| CT-62 | Duas entradas simultâneas no mesmo lote | O lote soma as duas quantidades e há duas entradas no histórico | Quantidade perdida ou lote duplicado |
| CT-63 | Duas saídas simultâneas que juntas passam do saldo | Uma é atendida e a outra recusada com 409; o saldo nunca fica negativo | As duas atendidas ou saldo negativo |
| CT-64 | Entrada e saída simultâneas no mesmo produto | O saldo final é o inicial + entrada − saída | Saldo final diferente |
| CT-77 | Aplicar as migrations sem `APP_DB_ROLE`, rodar `alembic upgrade head` com ela e depois a sincronização, duas vezes | Negado até a sincronização; depois, a API lê e insere com o usuário da aplicação, e a segunda execução não dá erro. O resumo no log não mostra URL nem senha | Permissão concedida só pela migration, erro na segunda execução ou segredo no log |
| CT-78 | Sincronizar com permissões a mais (GRANT ALL no histórico), sem CONNECT e USAGE explícitos e criar uma tabela nova como dono | Permissões a mais removidas; CONNECT e USAGE concedidos ao usuário; tabela nova com leitura e escrita e sequência só com USAGE | Histórico alterável, CONNECT ou USAGE perdidos, ou tabela nova sem acesso |
| CT-79 | Sincronizar com usuário inexistente, com o próprio dono, sem as migrations ou sem as variáveis | Recusada com mensagem clara, sem mudar nada | Permissões alteradas ou erro confuso |
| CT-80 | Em `APP_ENV=production`, subir sem `APP_DB_ROLE`, sem `MIGRATIONS_DATABASE_URL`, com a `DATABASE_URL` em outro usuário ou com o dono como usuário da aplicação | Recusa com mensagem clara, sem mostrar a URL, antes de qualquer migration; fora de produção, um usuário só continua valendo | Sobe mesmo assim ou mostra a URL |
| CT-81 | Subir a API em produção com o usuário da aplicação sem permissão, com UPDATE no histórico e depois da sincronização | Não sobe nos dois primeiros casos; sobe no terceiro | API no ar com permissões erradas |
| CT-83 | Aplicar a migration do código de barras com produtos gravados com espaços no código, e depois com dois produtos que ficariam com o mesmo código sem os espaços ("3037 3543" e "30373543"); depois, gravar direto no banco (fora da API) um código com espaço. Regra: [RN-04](regras-negocio.md) | No primeiro caso, os espaços somem de todos os códigos, rodar de novo não muda nada e a CHECK é criada; no segundo, a migration para com uma mensagem que lista os produtos que colidem, sem alterar nenhum código; a gravação direta é recusada pela CHECK ck_products_codigo_barras_sem_espacos | Código com espaço sobrando, código repetido gravado, alteração parcial antes do erro, ou o banco aceitando código com espaço |
| CT-100 | Aplicar a migration do teto dos dias de alerta num banco com produtos até 3650 dias, desfazer e aplicar de novo; aplicar com um produto acima do teto; depois, gravar 3651 direto no banco (fora da API), num INSERT e num UPDATE. Regra: [RN-26](regras-negocio.md) | No primeiro caso, a CHECK é criada e removida sem mudar nenhum produto; no segundo, a migration para com a lista dos produtos acima do teto, sem corrigir nada; a gravação direta é recusada pela CHECK ck_products_dias_alerta_validade_maximo | Dias alterados pela migration, CHECK criada com dado fora da faixa, ou o banco aceitando 3651 |
| CT-103 | Provocar um erro de SQL com um valor conhecido entre os parâmetros, com o engine da API, e conferir os das migrations, da recriação da demonstração e da sincronização de permissões. Regra: [RN-66](regras-negocio.md) | O texto do erro (o que vai para o log) tem o comando e o motivo, mas não os valores; a resposta da API também não | Valor do parâmetro no texto do erro ou na resposta |

## Regras sem banco (testes unitários)

Rodam com `pytest -m unitario` (dentro de `backend`), sem banco ligado (`DATABASE_URL` e `SECRET_KEY` só precisam estar preenchidas e podem ser falsas). O CT-110 é de integração e usa os mesmos valores-limite.

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-104 | Situação do estoque com disponível 0 (mínimo 0 e 5), 1 (mínimo 0 e 5) e, com mínimo 5, disponível 4, 5 e 6; disponível -1 e mínimo -1. Regras: [RN-13 e RN-41](regras-negocio.md) | 0 é sem estoque, mesmo com mínimo 0; 1 com mínimo 0 é ok; 1, 4 e 5 com mínimo 5 são baixo; 6 é ok; negativo é recusado | Disponível igual ao mínimo como ok, mínimo + 1 como baixo ou saldo negativo aceito |
| CT-105 | Lote que venceu ontem, vence hoje, amanhã, em hoje + dias de alerta - 1, + 0 e + 1 (30 dias; e no limite com 1 e 3650 dias), com quantidade 0 e -1, sem validade e em produto que não controla validade; e os dias para vencer, inclusive passando pelo 29 de fevereiro. Regras: [RN-14, RN-15, RN-36 e RN-42](regras-negocio.md) | Ontem é vencido e não sai; hoje é a vencer e ainda sai; hoje + dias de alerta é a vencer; um dia depois é ok; quantidade 0 e sem validade são ok; sem controle de validade nunca é a vencer; quantidade negativa é recusada | Lote que vence hoje tratado como vencido, limite deslocado em um dia ou lote zerado com alerta |
| CT-106 | Ordem de saída de lotes com um dia de diferença, com a mesma validade, sem validade e lista vazia. Regra: [RN-10](regras-negocio.md) | A menor validade sai primeiro; o empate é decidido pelo id; sem validade fica por último | Lote que vence depois sair antes |
| CT-107 | CNPJ com 13, 14 e 15 dígitos, com pontuação, com letra, só pontuação, vazio e só espaços. Regras: [RN-06 e RN-25](regras-negocio.md) | 14 dígitos (com ou sem pontuação) viram só os números; vazio conta como não informado; o resto é recusado | CNPJ com 13 ou 15 dígitos aceito |
| CT-108 | Dias de alerta -1, 0, 1, 3650 e 3651 em produto que controla validade, e vazio; em produto que não controla: vazio, 0 e 1. Regra: [RN-26](regras-negocio.md) | 1 e 3650 são aceitos; -1, 0, 3651 e vazio são recusados; sem controle, só vazio é aceito | Valor fora de 1 a 3650 aceito |
| CT-109 | Código de barras com espaço, tabulação, quebra de linha e espaço inseparável; com 0, 1, 49, 50 e 51 caracteres, e com 50 mais espaços. Regra: [RN-04](regras-negocio.md) | Os espaços saem antes de contar; de 1 a 50 caracteres é aceito; vazio e 51 são recusados | Espaço guardado no código ou 51 caracteres aceitos |
| CT-110 | Calcular a situação do estoque, a do lote, o lote disponível e o saldo disponível no banco (SQL) e em Python, com os mesmos valores do CT-104 e do CT-105 que o banco aceita, e com produto sem lotes. Regra: [RN-44](regras-negocio.md) | O SQL e o Python dão o mesmo resultado em todos os valores | As duas versões da regra discordam em algum limite |

## Listas paginadas

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-65 | Listar com mais itens que o limite (ex.: 60 produtos, limite padrão 50) | Devolve só 50 itens, com total 60; a página seguinte (deslocamento 50) traz os 10 restantes, sem repetir nenhum | Devolve todos os itens, total errado ou itens repetidos entre as páginas |
| CT-66 | Pedir uma lista com limite acima de 200 | Sistema recusa (422) | Lista devolvida com mais de 200 itens |
| CT-84 | Buscar nas listas de Produtos e de Estoque por um nome com espaço ("Leite integral") e por um código com espaço, quebra de linha ou espaço inseparável ("3037 3543"). Regras: [RN-51 e RN-04](regras-negocio.md) | O nome é encontrado com o espaço; o código é encontrado como se não tivesse os espaços, inteiro ou em parte | Nome com espaço deixa de ser encontrado, ou código com espaço não acha o produto |

## Demonstração

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-68 | Conta de demonstração tenta trocar a própria senha, com a senha atual certa | Sistema responde 403 "A conta de demonstração não pode trocar a senha." e a senha continua a mesma | Senha da conta de demonstração trocada |
| CT-69 | Recriar os dados de demonstração num banco com dados antigos | Banco recriado pelas migrations: só o admin de `ADMIN_EMAIL` e a conta de demonstração (operador) existem, os dados de exemplo e os alertas estão lá, nada antigo sobra, nenhum `revisor-ui@estoque.local`, e a data da recriação fica gravada | Dado antigo sobrando, outro admin, conta de demonstração admin ou revisor-ui criado |
| CT-70 | Pedir a recriação sem `DEMO_MODE=true`, sem a URL do dono ou sem `ADMIN_EMAIL`, `ADMIN_PASSWORD` ou `DEMO_PASSWORD` | Recusada com mensagem clara, sem tocar no banco | Banco apagado ou recriado |
| CT-71 | Iniciar a API em modo de demonstração com a última recriação há mais de 24 horas (ou nenhuma) e há menos de 24 horas | Recria no primeiro caso; no segundo, não mexe nos dados | Recria antes das 24 horas ou não recria depois delas |
| CT-72 | Usar um token emitido antes da recriação | Token recusado (401) | Token antigo continua valendo |
| CT-73 | Admin tenta mudar o perfil da conta de demonstração para admin | Sistema recusa (409) e a conta continua operador | Conta de demonstração vira admin |
| CT-74 | Abrir o login com e sem `VITE_DEMO` ligada, e "Minha conta" com a conta de demonstração | O botão "Entrar como demonstração" só aparece com `VITE_DEMO` e entra com a conta de demonstração; "Minha conta" esconde a troca de senha e explica o motivo | Botão sem `VITE_DEMO` ou formulário de troca de senha visível para a conta de demonstração |
| CT-75 | Conta de demonstração faz a 31ª alteração no mesmo minuto | Sistema responde 429 e nada é gravado; uma conta comum, no mesmo ritmo, não é limitada | Alteração gravada ou conta comum bloqueada |
| CT-76 | Em modo de demonstração, cadastrar o 101º produto ou fornecedor | Sistema recusa (409) e o cadastro não é salvo; fora do modo de demonstração, o cadastro é aceito | Produto ou fornecedor salvo acima do teto |

## Entrada da API

| ID | Teste | Resultado esperado | Resultado não esperado |
|---|---|---|---|
| CT-95 | Em cada rota com id na URL (produto, saldo e histórico do produto, fornecedor, usuário e senha do usuário, em todos os métodos), usar o id 0, -1, 2147483647 (que não existe), 2147483648 e 99999999999; e usar `deslocamento` -1 e 2147483648 e `produto_id` dos alertas 0 e 2147483648. Regra: [RN-61](regras-negocio.md) | 0, -1, 2147483648 e 99999999999 dão 422 apontando o id (`loc` ["path", nome do id]); 2147483647 dá 404; o mesmo nos números da query (422 fora da faixa, 200 no limite); toda rota com id aparece no OpenAPI com mínimo 1 e máximo 2147483647, e nenhum inteiro da URL passa desse máximo | Erro do servidor (500), 404 para id fora da faixa ou rota com id sem o limite |
| CT-96 | Mandar o caractere NUL (`\x00`) no início, no meio e no fim de cada campo de texto de cada corpo (inclusive o login, a troca de senha e o cadastro de usuário), na busca das listas e no código de barras da busca exata; e um surrogate sozinho (`\ud800`) no JSON. Regra: [RN-62](regras-negocio.md) | 422 no campo, com o tipo `texto_com_nul` e a mensagem da RN-62, e nada gravado; o surrogate sozinho também é 422; nome com espaço inseparável continua aceito; todo campo de texto do OpenAPI (inclusive lista ou tipo referenciado) está coberto pelo teste | Erro do servidor (500), texto com NUL gravado, ou campo de texto novo sem a recusa |
| CT-97 | Provocar 422 no login (sem e-mail, com a senha preenchida), na troca de senha, no cadastro de usuário e na senha definida pelo admin, com uma senha conhecida, e também com JSON quebrado, limite acima de 200, id fora da faixa e preço como número. Regra: [RN-63](regras-negocio.md) | Cada erro tem só `loc`, `msg` e `type`, dentro de `{"detail": [...]}`; a senha enviada não aparece em nenhum lugar da resposta; a tela continua marcando o campo | Resposta com `input` ou `ctx`, ou a senha ecoada no erro |
| CT-98 | Enviar um produto com o corpo de exatamente 64 KB, com 64 KB + 1 byte (com `Content-Length` e em partes, sem ele), e um login com senha de 64 KB (com `Content-Length` e em partes, como formulário comum e como multipart); e o corpo grande de uma origem liberada no CORS. No teste de unidade do limite, mandar o corpo em pedaços de 30 KB. Regra: [RN-64](regras-negocio.md) | 64 KB é aceito (201); acima disso, 413 com a mensagem da RN-64 e nada gravado, também no envio em partes e no login; a leitura para no pedaço que passa do teto, e com `Content-Length` acima dele nada do corpo é lido; o 413 sai com o cabeçalho do CORS e os de segurança | Corpo acima do teto lido ou gravado, erro do servidor, ou 413 que a tela não consegue ler |
