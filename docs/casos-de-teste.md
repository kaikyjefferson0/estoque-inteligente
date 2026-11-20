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

## Verificação SQL de fornecedores e produtos

### Escopo

- Um fornecedor pode ter vários produtos. O vínculo é opcional no produto (RN-24).
- O banco garante o formato e a unicidade do CNPJ informado (RN-25), a unicidade e a ausência de espaços no código de barras (RN-04) e as regras de estoque mínimo e validade (RN-05 e RN-26).
- O `DELETE` do seed recarrega dados fictícios no esquema da aula. A RN-23 continua valendo na aplicação e é coberta pelo CT-23 em [test_cadastros.py](../backend/tests/test_cadastros.py).
- Produtos e fornecedores deste recorte não têm campo monetário.

### Executar

Na raiz do repositório, crie o banco descartável e aplique o esquema uma vez. Use uma conta PostgreSQL local com permissão para criar bancos e ajuste a conexão ao seu ambiente.

~~~powershell
createdb estoque_aula_test
psql -X -v ON_ERROR_STOP=1 -d estoque_aula_test -1 -f db/postgresql/01-schema.sql
psql -X -v ON_ERROR_STOP=1 -d estoque_aula_test -1 -f db/seed.sql
psql -X -v ON_ERROR_STOP=1 -d estoque_aula_test -f db/postgresql/02-verificar.sql
psql -X -v ON_ERROR_STOP=1 -d estoque_aula_test -f db/postgresql/03-verificar-rollback-seed.sql
~~~

Se estiver usando o serviço `db` do Compose, rode os comandos abaixo no PowerShell.

~~~powershell
docker compose up -d --wait db
$usuarioPg = (docker compose exec -T db printenv POSTGRES_USER).Trim()
docker compose exec -T db createdb -U $usuarioPg estoque_aula_test
docker compose exec -T db mkdir -p /tmp/estoque-aula/postgresql
docker compose cp db/seed.sql db:/tmp/estoque-aula/seed.sql
docker compose cp db/postgresql/01-schema.sql db:/tmp/estoque-aula/postgresql/01-schema.sql
docker compose cp db/postgresql/02-verificar.sql db:/tmp/estoque-aula/postgresql/02-verificar.sql
docker compose cp db/postgresql/03-verificar-rollback-seed.sql db:/tmp/estoque-aula/postgresql/03-verificar-rollback-seed.sql
docker compose exec -T db psql -X -U $usuarioPg -d estoque_aula_test -v ON_ERROR_STOP=1 -1 -f /tmp/estoque-aula/postgresql/01-schema.sql
docker compose exec -T db psql -X -U $usuarioPg -d estoque_aula_test -v ON_ERROR_STOP=1 -1 -f /tmp/estoque-aula/seed.sql
docker compose exec -T db psql -X -U $usuarioPg -d estoque_aula_test -v ON_ERROR_STOP=1 -f /tmp/estoque-aula/postgresql/02-verificar.sql
docker compose exec -T db psql -X -U $usuarioPg -d estoque_aula_test -v ON_ERROR_STOP=1 -f /tmp/estoque-aula/postgresql/03-verificar-rollback-seed.sql
~~~

O seed apaga a tabela filha antes da pai. A opção `-1` aplica a carga inteira em uma transação. O verificador anuncia cada cenário que passou e desfaz as alterações às linhas no final. Em caso de falha, o `psql` encerra com erro. As sequências podem avançar mesmo quando as inserções são desfeitas.

No CT-V2-26, o PostgreSQL emite um `23514` esperado para a restrição temporária `ck_teste_seed_recusa_produto_6`. Em seguida, a mensagem de aprovação confirma que todas as colunas das duas tabelas voltaram aos valores anteriores. O teste também desfaz os registros que usou na preparação. Para o BD-06 da planilha, o teste de movimentação em [test_alerts.py](../backend/tests/test_alerts.py) já simula uma falha na geração de alertas e verifica a ausência de lote e movimentação após o rollback.

Para reproduzir o CT-V2-24, insira os dois registros extras no banco da aula. Em seguida, execute novamente o seed e o verificador.

~~~sql
BEGIN;
INSERT INTO estoque_aula.suppliers (id, nome) VALUES (90, 'Fornecedor extra');
INSERT INTO estoque_aula.products (id, nome, codigo_barras, fornecedor_id)
VALUES (90, 'Produto extra', '9000000000000', 90);
COMMIT;
~~~

### Matriz de cenários

| ID | Regra ou requisito | Ação | Resultado esperado |
|---|---|---|---|
| CT-V2-01 | Seed | Conferir as duas tabelas após a carga | Fornecedores com IDs 1 a 3 e produtos com IDs 1 a 6 |
| CT-V2-02 | RN-24 e `JOIN` | Consultar produtos com `LEFT JOIN` de fornecedores | Dois produtos de cada um dos fornecedores 1 e 2, e dois produtos sem fornecedor |
| CT-V2-03 | Relação 1:N e `GROUP BY` | Contar produtos por fornecedor | Totais 2, 2 e 0 para os fornecedores 1, 2 e 3 |
| CT-V2-04 | RN-04, RN-05, RN-06 e RN-24 | Inserir fornecedor sem CNPJ e produto com código de 50 caracteres sem preencher campos opcionais | IDs automáticos, estoque mínimo 0, controle de validade desligado, dias de alerta e fornecedor nulos |
| CT-V2-05 | PK | Inserir fornecedor com ID 1 já usado | `23505` · `suppliers_pkey` |
| CT-V2-06 | PK | Inserir produto com ID 1 já usado e código novo | `23505` · `products_pkey` |
| CT-V2-07 | RN-25 e CT-25 | Inserir fornecedor com CNPJ já cadastrado | `23505` · `uq_suppliers_cnpj` |
| CT-V2-08 | RN-04 e CT-05 | Inserir produto com código de barras já cadastrado | `23505` · `ix_products_codigo_barras` |
| CT-V2-09 | RN-25 e CT-25 | Gravar CNPJ com 13 dígitos | `23514` · `ck_suppliers_cnpj_14_digitos` |
| CT-V2-10 | RN-25 e CT-25 | Gravar CNPJ com 14 caracteres incluindo uma letra | `23514` · `ck_suppliers_cnpj_14_digitos` |
| CT-V2-11 | RN-24 e CT-24 | Vincular produto a fornecedor inexistente | `23503` · `fk_products_fornecedor_id_suppliers` |
| CT-V2-12 | FK com `RESTRICT` | Tentar excluir por SQL um fornecedor que tem produtos vinculados | `23503` · `fk_products_fornecedor_id_suppliers` |
| CT-V2-13 | RN-05 | Gravar estoque mínimo −1 por SQL | `23514` · `ck_products_estoque_minimo_nao_negativo` |
| CT-V2-14 | RN-26 e CT-26 | Apagar os dias de alerta de produto que controla validade | `23514` · `ck_products_dias_alerta_validade` |
| CT-V2-15 | RN-26 e CT-26 | Gravar zero dias de alerta em produto que controla validade | `23514` · `ck_products_dias_alerta_validade` |
| CT-V2-16 | RN-26 e CT-26 | Gravar um dia de alerta em produto sem controle de validade | `23514` · `ck_products_dias_alerta_validade` |
| CT-V2-17 | RN-04 e CT-82 | Gravar código com espaço comum | `23514` · `ck_products_codigo_barras_sem_espacos` |
| CT-V2-18 | RN-04 e CT-82 | Gravar código com tabulação | `23514` · `ck_products_codigo_barras_sem_espacos` |
| CT-V2-19 | RN-04 e CT-82 | Gravar código com espaço inseparável (U+00A0) | `23514` · `ck_products_codigo_barras_sem_espacos` |
| CT-V2-20 | RN-06 | Inserir fornecedor com nome nulo | `23502` · coluna `nome` |
| CT-V2-21 | Campo obrigatório | Inserir produto com nome nulo | `23502` · coluna `nome` |
| CT-V2-22 | RN-04 | Inserir produto com código de barras nulo | `23502` · coluna `codigo_barras` |
| CT-V2-23 | RN-04 e valor-limite | Inserir código com 51 caracteres, um acima do limite | `22001` · comprimento excedido |
| CT-V2-24 | Reexecução do seed | Inserir fornecedor e produto vinculados com ID 90, reaplicar o seed e rodar o verificador | Registros extras removidos e verificador aprovado na segunda rodada |
| CT-V2-25 | RN-26 e valor-limite | Gravar −1 dia de alerta em produto que controla validade | `23514` · `ck_products_dias_alerta_validade` |
| CT-V2-26 | Atomicidade do seed | Forçar uma falha ao gravar produtos, depois que o seed apagou as tabelas e reinseriu os fornecedores | `23514` esperado e rollback restaura o conteúdo anterior das duas tabelas |

Para a apresentação, rode o verificador e mostre o nome da restrição junto do SQLSTATE. Para demonstrar um erro diretamente no cliente SQL, use um comando individual da matriz em [02-verificar.sql](../db/postgresql/02-verificar.sql) no banco `estoque_aula_test`.
