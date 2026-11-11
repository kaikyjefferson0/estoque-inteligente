---
version: 1
slug: "frontend-src-layout-applayout-tsx"
primary_target: "frontend/src/layout/AppLayout.tsx"
related_targets: ["frontend/src/pages/LoginPage.tsx","frontend/src/pages/DashboardPage.tsx","frontend/src/layout/MenuLateral.tsx","frontend/src/styles/theme.css"]
---

# Superfície: área logada e login (identidade "Folhinha")

Modo: Operate. Público que decide: avaliador técnico (login, painel e capturas do README). Usuário simulado: operador de pequeno comércio no celular, com uma mão, e admin no computador. Tarefa central: ver e registrar entrada e saída; perceber validade, FEFO e histórico imutável em poucos minutos. Restrições: contraste de 4,5:1, situação nunca só por cor, foco visível, a partir de 320px, `theme.css` como fonte única dos tokens via `@theme`, ícones Tabler.

Decisões do dono (11/11/2026): painel com as 5 últimas movimentações (RN-45) mais a régua de vencimentos lida dos alertas ativos (sem mudar a API); barra inferior até 900px com Painel, Entrada, Saída, Alertas e "Mais" (abre a gaveta; o botão de menu do topo sai); página atual e dia com vencimento "circulados"; "Entrar como demonstração" continua secundário, com o bloco da demo mais destacado.

Em aberto: nenhum ponto de identidade. A ordem das telas segue o plano de migração para Tailwind.

## Direction contract

THESIS: A data é a figura principal. O sistema se veste como a folhinha que o comércio pendura perto do caixa: validade lida em dias, não em cartões de indicador. Recusa o arranjo padrão da categoria (cartões com sombra, ícone em quadradinho colorido, azul de SaaS).

OWN-WORLD: Papel branco, tinta preta #121212, tinta suave #5C5C58, vermelho #C40F2B só para crítico, âmbar e verde só para situação. Archivo com eixo de largura: interface em largura normal, títulos levemente estreitos, numerais condensados (62%, peso 800). Fios de 1px, fio de tinta de 2px abrindo tabelas e indicadores, picote pontilhado como divisor, raio de 2px. Atual e "dia com vencimento" circulados com contorno de tinta de 2px; placa preta só para "hoje" e para o botão principal. Tabler com traço 1,5.

STORY: O avaliador entra, vê a data de hoje na marca e, no painel, quais lotes vencem em quais dias e o que acabou de entrar e sair; entende que a tela segue as regras (RN-14, RN-36, RN-45) sem ler o código. O operador registra entrada e saída pela barra inferior, com o polegar.

FIRST VIEWPORT: Painel no computador: faixa preta de 56px com a marca (folha com a data de hoje) e o usuário; menu branco de 232px com a página atual circulada; título "Painel" com "Terça, 10 de novembro · situação às 19:32", Atualizar (fantasma) e Registrar entrada (placa preta) à direita; linha de indicadores com numerais condensados, "Sem estoque" como parte de "Estoque baixo"; régua de 21 dias com os dias de vencimento circulados e a quantidade em numeral; abaixo, as 5 últimas movimentações com fios de impressão e mini-folhas de data. No celular: a régua vira a folha do mês (3 semanas de 7 colunas) e a barra inferior fica fixa.

FORM: Folhinha de parede do comércio, 4ª de sete na lista ordenada (Kardex, código de lote em jato de tinta, genérico e tarjas, folhinha, cartaz fluorescente, formulário contínuo, sinalização de corredor). seed:75fd8940e18abd7f

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
