---
name: Estoque Inteligente
description: Controle de estoque com lotes e validade, vestido como a folhinha do caixa, em que a data é a figura principal e o vermelho só aparece no que está crítico.
colors:
  primaria: "#121212"
  primaria-escura: "#353532"
  primaria-pressionada: "#000000"
  primaria-clara: "#efefea"
  primaria-clara-pressionada: "#e4e4df"
  superficie: "#ffffff"
  fundo: "#ffffff"
  parede: "#ecece7"
  texto: "#121212"
  texto-suave: "#5c5c58"
  texto-inverso: "#ffffff"
  borda: "#dcdcd6"
  borda-forte: "#8a8a84"
  hover-neutro: "#f1f1ed"
  pressionado-neutro: "#e5e5e0"
  desabilitado-fundo: "#ecece8"
  desabilitado-texto: "#5f5f5a"
  foco: "#121212"
  faixa: "#121212"
  faixa-suave: "#bdbdb8"
  faixa-hover: "#2a2a28"
  faixa-pressionada: "#3a3a37"
  ok: "#1f7442"
  ok-texto: "#1f7442"
  ok-fundo: "#e9f5ee"
  atencao: "#c27a00"
  atencao-texto: "#8a5300"
  atencao-fundo: "#fff4dc"
  critico: "#c40f2b"
  critico-texto: "#c40f2b"
  critico-fundo: "#fdebee"
  critico-escura: "#9e0c23"
  critico-pressionada: "#7a0a1b"
  sobreposicao: "rgba(18, 18, 18, 0.45)"
typography:
  numeral-folha:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(7rem, 13vw, 12rem)"
    fontWeight: 800
    lineHeight: 1.55
    fontVariation: "'wdth' 62"
    fontFeature: "tnum"
  numeral-painel:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "3rem"
    fontWeight: 800
    lineHeight: 1.1
    fontVariation: "'wdth' 62"
    fontFeature: "tnum"
  headline:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.25
    fontVariation: "'wdth' 87.5"
  title:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.25
    fontVariation: "'wdth' 87.5"
  body:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  body-small:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
  meta:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
rounded:
  p: "2px"
  m: "2px"
spacing:
  esp-0: "0"
  esp-1: "4px"
  esp-2: "8px"
  esp-3: "12px"
  esp-4: "16px"
  esp-5: "24px"
  esp-6: "32px"
  esp-7: "48px"
components:
  botao-primaria:
    backgroundColor: "{colors.primaria}"
    textColor: "{colors.texto-inverso}"
    typography: "{typography.label}"
    rounded: "{rounded.p}"
    padding: "0 16px"
    height: "40px"
  botao-primaria-hover:
    backgroundColor: "{colors.primaria-escura}"
    textColor: "{colors.texto-inverso}"
  botao-primaria-active:
    backgroundColor: "{colors.primaria-pressionada}"
    textColor: "{colors.texto-inverso}"
  botao-secundaria:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    typography: "{typography.label}"
    rounded: "{rounded.p}"
    padding: "0 16px"
    height: "40px"
  botao-secundaria-hover:
    backgroundColor: "{colors.hover-neutro}"
    textColor: "{colors.texto}"
  botao-fantasma:
    backgroundColor: "transparent"
    textColor: "{colors.primaria}"
    typography: "{typography.label}"
    rounded: "{rounded.p}"
    padding: "0 16px"
    height: "40px"
  botao-fantasma-hover:
    backgroundColor: "{colors.primaria-clara}"
    textColor: "{colors.primaria-escura}"
  botao-perigo:
    backgroundColor: "{colors.critico}"
    textColor: "{colors.texto-inverso}"
    typography: "{typography.label}"
    rounded: "{rounded.p}"
    padding: "0 16px"
    height: "40px"
  botao-perigo-hover:
    backgroundColor: "{colors.critico-escura}"
    textColor: "{colors.texto-inverso}"
  botao-desabilitado:
    backgroundColor: "{colors.desabilitado-fundo}"
    textColor: "{colors.desabilitado-texto}"
  campo:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    typography: "{typography.body}"
    rounded: "{rounded.p}"
    padding: "0 12px"
    height: "40px"
  campo-desabilitado:
    backgroundColor: "{colors.desabilitado-fundo}"
    textColor: "{colors.desabilitado-texto}"
  painel:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.m}"
    padding: "16px 24px"
  metadado:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto-suave}"
    typography: "{typography.meta}"
    rounded: "{rounded.p}"
    padding: "0 8px"
  cabecalho:
    backgroundColor: "{colors.faixa}"
    textColor: "{colors.texto-inverso}"
    padding: "0 24px"
    height: "56px"
  folha-marca:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.p}"
    width: "32px"
  menu-link:
    backgroundColor: "transparent"
    textColor: "{colors.texto-suave}"
    typography: "{typography.body-small}"
    rounded: "{rounded.p}"
    padding: "0 12px"
    height: "40px"
  menu-link-hover:
    backgroundColor: "{colors.hover-neutro}"
    textColor: "{colors.texto}"
  menu-link-atual:
    backgroundColor: "transparent"
    textColor: "{colors.texto}"
  menu-contagem:
    backgroundColor: "{colors.atencao-fundo}"
    textColor: "{colors.atencao-texto}"
    typography: "{typography.meta}"
    rounded: "{rounded.p}"
    padding: "0 8px"
  segmento-escolhido:
    backgroundColor: "transparent"
    textColor: "{colors.texto}"
    typography: "{typography.label}"
    rounded: "{rounded.p}"
    padding: "0 16px"
    height: "40px"
  aviso-critico:
    backgroundColor: "{colors.critico-fundo}"
    textColor: "{colors.texto}"
    typography: "{typography.body-small}"
    rounded: "{rounded.p}"
    padding: "12px 16px"
  aviso-atencao:
    backgroundColor: "{colors.atencao-fundo}"
    textColor: "{colors.texto}"
    typography: "{typography.body-small}"
    rounded: "{rounded.p}"
    padding: "12px 16px"
  dialogo:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.m}"
    padding: "24px"
    width: "440px"
---

# Design System: Estoque Inteligente

> **Fonte dos tokens:** todos os valores moram em `frontend\src\styles\theme.css`, a única fonte de cores, espaçamentos, fontes, raios, sombras e durações; cada chave do frontmatter acima corresponde a uma variável dele (`primaria` → `--cor-primaria`, `p` → `--raio-p`, `esp-4` → `--esp-4`). Com o Tailwind CSS v4, o fluxo é: tokens no `theme.css` → `@theme inline` em `frontend\src\styles\tailwind.css`, só com referências `var(--...)`, nenhum valor repetido → classes com o mesmo nome do token (`bg-primaria`, `p-esp-4`, `rounded-p`, `shadow-flutuante`, `text-fs-2`, `max-w-largura-conteudo`, `max-w-largura-formulario`, `grid-cols-rotulo-valor`). A classe `border` usa a largura do tema (`--borda-largura`), não o 1px embutido do Tailwind. Os padrões do Tailwind (cores, espaçamento, raios, sombras, fontes, pesos, tamanhos, entrelinhas e espaçamento entre letras) estão desligados com `initial` e o lint recusa valores arbitrários (`p-[13px]`), por isso as regras abaixo valem igual para as classes; `min-w-esp-0` faz o papel do `min-w-0`. Dois tokens não têm namespace de tema no Tailwind v4 e viram utilitários próprios, também só com `var(--...)`: `@utility font-stretch-titulo` (`font-stretch: var(--largura-titulo)`; o `font-stretch-*` nativo só aceita porcentagem crua) e `@utility border-t-picote` (`border-top: var(--picote)`; borda pontilhada não é valor de tema); do mesmo jeito, `border-t-tinta` (o fio de tinta no topo), `border-circulado` (largura e estilo do circulado, com a cor em `border-texto` ou `border-transparent`), `foco-forte` (anel de 3px afastado) e `pb-area-segura` (a área segura do aparelho embaixo). Dimensões de componente também passam pelo `@theme` (`size-icone-m`, `w-folha-data`, `min-h-dia-regua`, `min-h-item-barra`, `z-cabecalho`), e a duração e a curva padrão das transições do Tailwind apontam para `--mov-rapido` e `--mov-curva`. Os cortes do layout viram variantes com o mesmo valor do CSS antigo (`ate-640:` é `@media (max-width: 640px)`, `ate-900:` é `@media (max-width: 900px)`), nunca `max-sm:`, que erra exatamente em 640px; a régua de vencimentos usa uma variante de container, `regua-estreita:` (`@container (max-width: 42rem)`). O Preflight está desligado: o reset do `global.css` (margem de `h1` a `h3`, `p`, `ul`, `ol`, `dl` e `dd`; recuo e marcador de `ul` e `ol`; peso, largura e entrelinha de `h1` a `h3`; tamanho de `h1` e `h2`; fonte e cor herdadas nos controles; cor dos links; anel de foco; `scroll-padding-top`) fica em `@layer base`, na ordem de camadas declarada no `tailwind.css` (`theme, base, components, utilities`), que por isso é importado antes do `global.css` no `main.tsx`: os utilitários vencem o reset, e o CSS sem camada (`componentes.css`, `layout.css` e o CSS das telas não migradas) vence os dois. O espaço entre um título e o texto de apoio vem do `gap` do bloco que os contém. As telas migram uma a uma; até lá, as não migradas seguem no CSS delas.

## Overview

**Creative North Star: "A Folhinha do Caixa"**

Todo comércio tem, pendurada perto do caixa, uma folhinha: papel branco, tinta preta, um cabeçalho escuro e o dia em numeral grande. O Estoque Inteligente se veste assim, porque o que ele controla é exatamente isso: validade lida em dias. A data é a figura principal. A marca é uma folha com o dia de hoje (em Brasília); o subtítulo do Painel diz o dia antes de qualquer número ("Quarta, 11 de novembro · situação às 14:52"); os indicadores são numerais condensados e pesados, como os de calendário; e a página atual, como o dia marcado à caneta, fica **circulada** a tinta.

O clima é **impresso, direto e honesto**. Impresso, porque a tela é papel e tinta: fundo branco, texto quase preto, fios de 1px, um **fio de tinta** de 2px abrindo tabelas e indicadores, e o **picote** pontilhado separando grupos, como a linha onde se destaca a folha. Direto, porque o vermelho da folhinha é reservado ao que está crítico, e o âmbar e o verde só aparecem como sinal de situação. Honesto, porque nada é enfeite: nenhum cartão com sombra, nenhum ícone em quadradinho colorido, nenhum azul de SaaS, nenhum estado que a regra de negócio não confirma. A densidade é média: alvos de 40px no computador e 44px no celular, listas com ar suficiente para o toque.

O sistema é só claro, sem tema escuro. A única superfície escura é a **faixa preta** do cabeçalho, o topo impresso da folhinha. A **placa preta** (fundo de tinta com texto branco) é do botão principal e do dia de hoje na régua de vencimentos; o atual e o escolhido nunca ganham placa nem fundo colorido, só o circulado.

**Key Characteristics:**
- Papel branco e tinta #121212; vermelho só para o crítico, âmbar e verde só para situação.
- Archivo com eixo de largura: interface em largura normal, títulos a 87,5%, numerais a 62% e peso 800.
- Fio de tinta de 2px abrindo listas de dados; picote pontilhado de 2px como divisor de grupos.
- Atual e escolhido circulados com contorno de tinta de 2px; placa preta só no botão principal.
- Cantos de papel cortado (2px); plano, com sombra só no que flutua e na folha do dia pendurada.
- Escala de espaçamento de 4px, sem exceções; movimento curto (140 a 200ms) e só em resposta a uma ação.

## Colors

Papel e tinta, com três cores de situação que só falam quando há algo a dizer.

### Primary
- **Tinta** (`primaria`): botão principal (a placa preta), link, contorno do circulado e anel de foco (`foco`). Branco por cima tem 18,7:1. É também o texto (`texto`), com o mesmo valor: na folhinha, a ação e a letra são da mesma tinta.
- **Tinta Gasta** (`primaria-escura`): hover do botão principal e dos links (branco por cima 12,3:1); estado de carregando do botão principal.
- **Tinta Carregada** (`primaria-pressionada`): `:active` do botão principal, preto puro.
- **Papel Riscado** (`primaria-clara`, `primaria-clara-pressionada`): hover e `:active` do botão fantasma e a opção destacada na seleção com busca.

### Secondary
- **Vermelho da Folhinha** (`critico`, `critico-texto`, `critico-fundo`): só o que está crítico: sem estoque, lote vencido, erro de formulário e ação destrutiva. 6,1:1 sobre o papel e 5,3:1 sobre o próprio fundo. `critico-escura` (8,3:1) e `critico-pressionada` (11,1:1) são o hover e o `:active` do botão de perigo.
- **Âmbar de Validade** (`atencao`, `atencao-texto`, `atencao-fundo`): estoque baixo, lote perto do vencimento e a contagem de alertas no menu. A cor do sinal (`atencao`) tem só 3,5:1 e nunca vira texto; o texto usa `atencao-texto` (5,8:1 sobre o fundo âmbar).
- **Verde Conferido** (`ok`, `ok-texto`, `ok-fundo`): situação em dia, no ícone do sinal. 5,8:1 sobre o papel e 5,2:1 sobre o fundo verde.

### Neutral
- **Papel** (`superficie`, `fundo`): fundo da aplicação, painéis, menu lateral, campos, diálogos e etiquetas de metadado. Os dois têm o mesmo branco: painéis se separam pela borda, não pelo tom.
- **Parede** (`parede`): só atrás da folha do dia, no login; nunca leva texto por cima.
- **Tinta Suave** (`texto-suave`): rótulos secundários, metadados, descrições, ícones em repouso e itens do menu fora da página atual (6,7:1 sobre o papel, 5,3:1 no pressionado).
- **Branco Inverso** (`texto-inverso`): texto sobre a placa preta, a faixa e o vermelho do botão de perigo.
- **Fio** (`borda`): borda de 1px de painéis, divisórias entre linhas e o contorno das etiquetas de metadado.
- **Grafite** (`borda-forte`): contorno dos campos em repouso (3,5:1 sobre o papel), hover do botão secundário, sublinhado claro dos nomes em lista e a cor do picote.
- **Toque Neutro** e **Pressão Neutra** (`hover-neutro`, `pressionado-neutro`): hover e `:active` de tudo o que não é a placa preta, e o fundo do foco pelo teclado nos itens que podem estar circulados.
- **Bloqueado** (`desabilitado-fundo`, `desabilitado-texto`): controles desabilitados. O texto bloqueado tem 5,4:1 de propósito: desabilitado também se lê.
- **Faixa** (`faixa`, `faixa-suave`, `faixa-hover`, `faixa-pressionada`): o cabeçalho preto, o texto secundário sobre ele (perfil, ícones; 9,9:1) e o hover e o pressionado dos controles sobre ele (branco por cima 14,4:1 e 11,4:1).
- **Sobreposição** (`sobreposicao`): véu de tinta a 45% atrás de diálogos e da gaveta.

### Named Rules
**A Regra do Vermelho da Folhinha.** O vermelho só marca o que está crítico (sem estoque, vencido, erro, ação destrutiva). Nunca em título, ícone decorativo, borda de painel ou botão comum.

**A Regra da Placa Única.** A placa preta (fundo de tinta, texto branco) é do botão principal, e há um só por tela; a única outra placa é o dia de hoje na régua de vencimentos, como o dia marcado na folhinha. Página atual e opção escolhida ficam circuladas, nunca em placa nem com fundo colorido.

**A Regra da Cor que Não Fala Sozinha.** Toda situação tem texto ("Estoque baixo", "Vencido", "Sem estoque") e um ícone com forma própria (círculo com check, triângulo, círculo com X). A cor reforça, nunca é a única informação.

## Typography

**Display Font:** Archivo, com eixo de largura de 62 a 100 (com system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Archivo (a mesma família, em largura normal)

**Character:** Uma família grotesca com eixo de largura, carregada nos pesos 400, 500 e 800. Em largura normal, é a letra calma da interface; estreitada e pesada, vira o numeral impresso da folhinha. A hierarquia vem da largura, do tamanho e da cor, não de negrito no texto.

### Hierarchy
- **Numeral da folha** (800, `clamp(7rem, 13vw, 12rem)`, largura 62%, algarismos tabulares): o dia na folha do dia do login. A entrelinha é a do corpo (1,55), para o dia gigante não encostar no dia da semana, nem enquanto a fonte carrega.
- **Numeral do painel** (800, 3rem, 1.1, largura 62%, algarismos tabulares): os três números de situação do Painel; caem para 2rem até 900px. A mesma classe de numeral (largura 62%, peso 800) vale para o dia da folha da marca (1.125rem) e para a quantidade das últimas movimentações.
- **Headline** (500, 1.5rem, 1.25, largura 87,5%): título da página (`h1`), um por tela, com a linha de apoio em `body-small` e `texto-suave` logo abaixo.
- **Title** (500, 1.125rem, 1.25, largura 87,5%): título de seção (`h2`), cabeçalho de painel e título de diálogo. O `h3` tem o peso, a largura e a entrelinha dos títulos, no tamanho do corpo.
- **Body** (400, 1rem, 1.55): texto corrido, valores digitados nos campos, nomes em listas (em 500). Texto longo para em 68ch.
- **Body small** (400, 0.875rem, 1.55): apoio, dicas e erros de campo, itens do menu, avisos, paginação.
- **Label** (500, 0.875rem, 1.25): rótulos de campo, texto de botão, segmentos, cabeçalhos de tabela (estes em `texto-suave`).
- **Meta** (400, 0.8125rem, 1.55, algarismos tabulares): etiquetas de metadado, perfil no cabeçalho, mês da folha da marca.

### Named Rules
**A Regra dos Três Pesos.** O texto usa 400 e 500; o 800 é só do numeral condensado. Nada de 600 ou 700.

**A Regra da Folha Impressa.** Títulos `h1` a `h3` saem a 87,5% de largura pelo reset (`--largura-titulo`), como o cabeçalho impresso da folhinha; números grandes saem a 62% e 800 pela classe `numeral`. Nenhuma outra largura.

**A Regra da Coluna Alinhada.** Quantidade, saldo, data, contagem e código de barras usam algarismos tabulares. Número e unidade nunca se separam: "500 g" leva espaço inseparável.

**A Regra da Caixa de Frase.** Texto em caixa de frase, sem CAIXA ALTA; o mês da folha do dia só ganha a primeira letra maiúscula.

## Layout

A área logada tem a **faixa preta** fixa de 56px no topo (marca à esquerda, conta à direita), um **menu lateral** branco de 232px, também fixo, e o **conteúdo** com recuo de 32px e largura máxima de 1120px. Tudo se alinha à esquerda. Como o cabeçalho é fixo, a rolagem até um controle focado deixa a altura dele mais 8px de folga (`scroll-padding-top`), para o anel de foco aparecer inteiro; até 900px, a **barra inferior** fixa ganha a mesma folga embaixo (`scroll-padding-bottom`), e o conteúdo termina 24px acima dela.

O **login** é a folhinha pendurada: no computador, duas colunas iguais; à esquerda, a parede com a folha do dia centrada e separada por um fio de tinta; à direita, o formulário no papel (até 400px), com a entrada de demonstração aberta por outro fio de tinta.

Cada página é uma coluna com 24px entre blocos. No topo, o **cabeçalho da página**: título e linha de apoio à esquerda, ações à direita, alinhados pela base e quebrando para baixo quando não cabem. No Painel e no Estoque, a linha de apoio começa pelo dia em Brasília ("Quarta, 11 de novembro · situação às 14:52" no Painel, "· saldos às" no Estoque); o dia não depende da API e já aparece no carregando e no erro, só a hora espera a resposta. Formulários ficam numa coluna de até 560px, com o rótulo acima do campo e os grupos separados pelo picote. Diálogos têm 440px e menus suspensos começam em 240px.

**Ritmo:** margem, recuo e espaço entre itens só da escala de 4px (`esp-0` a `esp-7`, de 0 a 48px). Dentro do painel, as linhas de lista usam 12px na vertical e 24px na horizontal; os cabeçalhos de painel, 16px por 24px.

**Responsivo:**
- **≤ 900px:** o menu lateral sai e entra a **barra inferior** fixa (Painel, Entrada, Saída, Alertas e Mais); o menu inteiro vira uma gaveta (288px, até 85% da largura) aberta pelo "Mais", e o cabeçalho não tem mais botão de menu; os alvos de toque sobem de 40 para 44px; o conteúdo usa recuo de 24px por 16px; os numerais do Painel caem de 48 para 32px; o login fica só com o formulário, com a folha da marca invertida e um fio de tinta embaixo dela.
- **≤ 640px:** painéis e formulários reduzem o recuo interno para 16px (nas classes, `ate-640:p-esp-4`); a lista de rótulo e valor põe o valor embaixo do rótulo; no Painel, "Estoque baixo" ocupa a linha inteira e "A vencer" e "Vencidos" dividem a de baixo; os segmentos de Alertas viram grade 2×2.
- **Régua com menos de 42rem de largura própria** (container query, não a tela: vale também para o zoom de 200%): os 21 dias viram a folha do mês, 3 semanas de 7 colunas, com a linha dos dias da semana em cima.
- **≤ 480px:** as ações da página descem para baixo do título (o botão fantasma que abre a linha desconta o próprio recuo para alinhar com o título); o perfil some do cabeçalho.
- **≤ 400px:** o nome do usuário vira um ícone e a marca encolhe; os botões do diálogo empilham com largura total, com a ação principal em cima.
- **Tabelas** viram listas empilhadas por container query, quando o próprio painel tem menos de 48rem: nome numa linha própria, as outras células como etiquetas de metadado embaixo e a ação no fim.

Larguras de revisão obrigatórias: 320, 360, 375, 390, 414, 768, 1024, 1280 e 1440px, mais o zoom de 200%. Em nenhuma delas pode haver rolagem horizontal da página.

### Named Rules
**A Regra da Escala de 4px.** Nenhum espaçamento fora de `esp-0` a `esp-7`. Um valor que não está na escala é um erro, não um ajuste fino.

**A Regra do Nome na Própria Linha.** Em listas, o nome do item fica sozinho na sua linha (no máximo 2 linhas, com reticências, quebrando só entre palavras); só uma quantidade pode ficar à direita dele. O resto vai embaixo, como etiquetas.

## Elevation & Depth

O sistema é **plano**, como papel impresso. Tudo o que está na página fica no mesmo plano e se separa por fios: a borda de 1px, o fio de tinta de 2px que abre as listas de dados e o picote pontilhado entre grupos. Painéis e fundo têm o mesmo branco; quem separa é o fio. Profundidade só existe no que flutua sobre a página e na folha do dia, que está pendurada na parede do login.

### Shadow Vocabulary
- **Flutuante** (`box-shadow: 0 8px 24px rgba(18, 18, 18, 0.14)`): diálogo de confirmação, gaveta do celular, menu suspenso, lista de opções da seleção com busca e a folha do dia sobre a parede do login. Nada mais.

### Named Rules
**A Regra do Que Flutua.** Nada que está na página tem sombra, nem no hover. A sombra flutuante é das camadas que se sobrepõem ao conteúdo e da folha do dia, a única folha solta do sistema. O hover muda o fundo ou o contorno, nunca a elevação.

**A Regra do Fio de Tinta.** Tabelas, listas de dados (movimentações, alertas, histórico), a linha de situações e a régua de vencimentos do Painel abrem com o fio de tinta de 2px no topo, e a barra inferior do celular também. Painéis comuns, de formulário ou de vazio, ficam só com a borda de 1px.

## Shapes

Cantos de papel cortado, quase retos: **2px** para tudo (`p` nos controles, `m` em painéis, diálogos e menus suspensos; os dois existem para os papéis continuarem separados se um dia mudarem). Não há pílulas; o único círculo é o indicador de carregando. As bordas são de 1px; as de 2px são só três: o fio de tinta (sólido, em `texto`), o picote (pontilhado, em `borda-forte`) e o circulado do atual e do escolhido (sólido, em `texto`). Uma faixa colorida na borda de um item não existe neste sistema.

### Named Rules
**A Regra do Circulado.** O atual e o escolhido (página do menu e da barra inferior, opção dos segmentos, lote escolhido) e o dia com vencimento na régua levam um contorno de tinta de 2px colado, sempre presente e transparente quando não marcado, para o tamanho não mudar. Nada mais no sistema usa esse contorno.

**A Regra do Picote.** O pontilhado de 2px separa partes de uma mesma folha: grupos de um formulário, o topo da folha da marca, o rodapé da folha do dia e, no Painel, a parte crítica ("1 sem estoque") dentro do grupo "Estoque baixo". Entre blocos independentes, o divisor é o fio de 1px.

## Components

Impressos e firmes: o alvo de toque é generoso, os cantos são de papel cortado e a força vem da tinta, não de enfeite.

### Buttons
- **Shape:** cantos de 2px; altura mínima do alvo de toque (40px, 44px no celular); recuo horizontal de 16px; texto em `label`; ícone opcional de 18px à esquerda, com 8px de espaço.
- **Primário (placa preta):** fundo de tinta, texto branco. Um por tela, com verbo ("Registrar entrada").
- **Hover / Active:** a placa vai para Tinta Gasta e depois para preto puro; transição de 140ms em fundo, borda e cor.
- **Focus:** anel de tinta de 2px, afastado 2px (`:focus-visible`, só pelo teclado); sobre a faixa preta, o anel fica branco.
- **Secundário:** papel com borda de 1px no Fio e texto em tinta; no hover, Toque Neutro e borda em Grafite.
- **Fantasma:** sem fundo, texto em tinta; no hover, Papel Riscado. É o padrão das ações de apoio no cabeçalho da página ("Atualizar").
- **Perigo:** fundo vermelho, texto branco; só em confirmações de ação irreversível.
- **Desabilitado:** Bloqueado, com cursor de bloqueio.
- **Carregando:** mantém a cor da variante (um passo mais escura), troca o texto ("Atualizando…") e gira o ícone; não parece desabilitado.
- **Botão-ícone:** quadrado do alvo de toque, sem fundo, ícone de 20px em `texto-suave`; no hover, Toque Neutro. Sobre a faixa, o ícone fica em `faixa-suave` e o hover em `faixa-hover`.

### Chips (etiquetas de metadado)
- **Style:** papel, borda de 1px no Fio, cantos de 2px, recuo de 8px, texto `meta` em `texto-suave`. Ícone opcional de 18px (o tipo da movimentação).
- **Comportamento:** ficam numa linha própria abaixo do nome e passam para a de baixo quando não cabem, com 4px de espaço vertical e 8px horizontal. São uma lista de definição: o rótulo fica oculto (só leitor de tela e cópia) salvo quando é preciso lê-lo ("Lote"), e o valor aparece com reticências se não couber.
- **Contagem do menu:** fundo `atencao-fundo`, texto `atencao-texto` em 500, à direita do rótulo "Alertas".
- **"Você" em Usuários:** a mesma etiqueta, com o texto em tinta e 500.

### Cards / Containers (painel)
- **Corner Style:** 2px.
- **Background:** papel, sobre o mesmo papel.
- **Shadow Strategy:** nenhuma (ver A Regra do Que Flutua).
- **Border:** 1px no Fio; o painel de dados troca o topo pelo fio de tinta de 2px; o cabeçalho do painel é separado por outro fio de 1px.
- **Internal Padding:** cabeçalho em 16px por 24px; linhas de lista em 12px por 24px; no celular, 12px por 16px.
- Não há grade de cartões repetidos: o conteúdo é uma lista ou tabela dentro de um painel.

### Lista de rótulo e valor (detalhe)
Dados de um registro mostrados por inteiro (Minha conta: nome, e-mail, perfil), num `<dl>` dentro do painel.
- **Grade:** rótulo numa coluna fixa de 128px e o valor no resto, podendo encolher (`grid-cols-rotulo-valor`); 16px entre as colunas, 4px entre linhas e 12px entre um item e o próximo.
- **Rótulo:** `body-small` em `texto-suave`. **Valor:** `body` em `texto`, inteiro, quebrando entre palavras; só um texto que sozinho não cabe na linha (um e-mail longo) quebra no meio.
- **≤ 640px:** uma coluna só, com o valor embaixo do rótulo.

### Inputs / Fields
- **Style:** rótulo `label` acima; caixa de papel com borda de 1px em Grafite, cantos de 2px, altura do alvo de toque, recuo de 12px, texto `body`. O acessório (mostrar senha, abrir lista) fica dentro da caixa.
- **Hover:** a borda escurece para `texto-suave`.
- **Focus:** borda de tinta mais anel de 2px colado na caixa.
- **Error:** borda e anel em vermelho em todos os estados; mensagem em `body-small` `critico-texto` abaixo, ligada por `aria-describedby`; o erro some assim que a pessoa edita.
- **Disabled / somente leitura:** Bloqueado com a borda clara; um select bloqueado mantém o valor em `texto-suave`, sem a opacidade do navegador.
- **Select:** nativo, com a aparência do campo e uma seta de 18px na mesma célula.
- **Seleção com busca:** lista flutuante abaixo do campo (sombra flutuante, até 320px de altura); opção destacada em Papel Riscado.
- **Grupos:** campos ligados (validade e dias de alerta, troca de senha) ficam num grupo aberto pelo picote, com 16px acima e 12px entre os campos (nas classes, `border-t-picote pt-esp-4`).

### Navigation
- **Cabeçalho (faixa preta):** 56px de tinta com a marca à esquerda e a conta à direita. A marca é a **folha da marca** (32px de papel com o picote no topo, o dia em numeral e o mês abreviado embaixo, em Brasília) seguida de "Estoque Inteligente" em 500. O botão da conta mostra nome e perfil (perfil em `faixa-suave`) e uma seta que gira 180° com o menu aberto; o nome acessível começa pelo texto visível ("Ana Souza, Operador, menu da conta"), sem repetir o perfil quando ele é o próprio nome.
- **Menu lateral:** links em `body-small` e `texto-suave` com ícone de 20px e 12px de espaço, altura do alvo de toque, cantos de 2px. Hover em Toque Neutro com texto em tinta; `:active` em Pressão Neutra.
- **Página atual:** circulada (contorno de tinta de 2px), texto em tinta e 500, sem fundo.
- **Foco pelo teclado no menu e nos segmentos:** fundo Toque Neutro e anel de 3px (`foco-anel-forte`): afastado 2px no menu, por dentro nos segmentos. É outra forma, para não parecer um segundo circulado.
- **Barra inferior (≤ 900px):** fixa embaixo, em papel aberto pelo fio de tinta, com cinco itens de mesma largura (ícone de 20px e rótulo em `meta`, 56px de altura, 4px entre eles e de respiro, mais a área segura do aparelho): Painel, Entrada, Saída, Alertas (com a mesma contagem do menu ao lado do sino, na mesma linha, "99+" acima de 99, e o nome "Alertas, 8 ativos") e **Mais**, que abre a gaveta. A página atual fica circulada; fora das quatro páginas da barra, o "Mais" fica circulado e o nome dele diz onde a pessoa está ("Mais, você está em Estoque"). Foco pelo teclado com fundo Toque Neutro e anel de 3px por dentro do item (`foco-forte-dentro`), porque entre os itens só há 4px. Em 320px os cinco itens têm 59px de largura, sem rolagem lateral, e o sino com "99+" ainda cabe dentro do circulado.
- **Gaveta (≤ 900px):** o menu inteiro, aberto pelo "Mais", desliza pela esquerda em 200ms, com sombra flutuante e véu de sobreposição; fecha ao navegar e, com Esc, devolve o foco ao "Mais".

### Segmentos
Escolha única entre poucas opções (rádios nativos que cobrem a opção inteira): uma faixa de papel com borda de 1px e cantos de 2px, opções separadas por fios de 1px, texto `label` em `texto-suave`. A opção escolhida fica circulada a tinta, com o texto em tinta; o hover das outras usa Toque Neutro.

### Sinal da situação (assinatura)
A situação de itens de estoque, lotes e alertas é escrita com o **sinal**: um ícone de 18px com forma própria por situação (círculo com check para ok, triângulo para atenção, círculo com X para crítico), na cor da situação, seguido do texto que a nomeia, alinhados pela linha de base. Em atenção e crítico o texto também fica na cor de texto da situação e em 500; o ok fica calmo, em `texto-suave`. As listas não ganham fundo tingido: o item só define as cores da situação para os filhos (por exemplo, o saldo na cor da situação). Em Alertas, um produto com saldo zero continua no grupo "Estoque baixo", mas com o rótulo "Sem estoque" em crítico.

### Código de barras (assinatura)
Um padrão só em todas as telas: ícone de código de barras em `texto-suave`, dígitos em grupos como os impressos sob as barras (EAN-13 em 1-6-6), com 4px entre os grupos vindos do CSS, algarismos tabulares e sem quebra. A cópia sai só com os dígitos.

### Linha de situações do Painel (assinatura)
Três células numa única linha de folhinha, aberta pelo fio de tinta e fechada por um fio de 1px, divididas por fios verticais e sem cartões: **Estoque baixo** (com os "Sem estoque" dentro), **A vencer** e **Vencidos**. Cada célula tem o sinal com o título, o numeral do painel e uma descrição em `meta`. Com zero, o sinal é ok, o numeral fica em `texto-suave` e a descrição diz "Nada pendente"; acima de zero, o numeral ganha a cor de texto da situação. A parte crítica do grupo ("1 sem estoque") vem embaixo, separada pelo picote, com o sinal crítico. A primeira célula não tem recuo à esquerda, para o numeral alinhar com o título da página.

### Régua de vencimentos (assinatura, Painel)
Os 21 dias a partir de hoje (em Brasília), lidos dos alertas ativos de validade (RN-14 e RN-15), entre a linha de situações e as últimas movimentações. Título "Vencimentos" com a linha de apoio "Próximos 21 dias, até 01/12". Os **vencidos** vêm antes da régua, com o sinal crítico e o texto ("3 lotes vencidos") e o link "Ver vencidos". A régua abre com o fio de tinta e fecha com um fio de 1px; cada dia tem o mês (só no primeiro dia e na virada), o dia da semana ("hoje" no primeiro), o número em numeral de 18px numa caixa de 36px de altura e no máximo 40px de largura (o circulado fica quase quadrado e dias vizinhos não se colam) e, embaixo, a **quantidade de lotes** que vencem nele, em numeral na cor de texto de atenção. Hoje fica em placa preta e, se também tem vencimento, leva o circulado em branco dentro da placa; o dia com vencimento, circulado a tinta; os outros, em `texto-suave`. Na folha do mês, a linha de dias da semana fica em cima (sempre o dia da semana; hoje é a placa), e as linhas do mês e das quantidades só ocupam espaço nas semanas que as usam. Embaixo, a legenda com um dia circulado de exemplo dentro da frase ("Dia circulado: vencem lotes nesse dia, e o número embaixo diz quantos. 4 lotes em 4 dias.", com a explicação do desenho fora do leitor de tela), ou "Nenhum vencimento nos próximos 21 dias." no vazio, e a linha "Mais 2 lotes vencem depois de 01/12." com o link "Ver a vencer" (nome diferente do "Ver alertas" do Painel, que leva a outro lugar). A grade é só visual (`aria-hidden`): uma lista oculta diz ao leitor de tela só os dias com vencimento ("sábado, 14 de novembro: 2 lotes vencem"). Conta lotes, não alertas; um alerta de vencimento próximo com a validade já passada conta como vencido. Carregando e erro usam os estados do sistema, e o "Atualizar" do Painel recarrega a régua junto.

### Mini-folha de data
A data de cada movimentação (o `criado_em` dela, em Brasília) como uma folhinha de 40px à esquerda da linha, nas últimas movimentações do Painel e no Histórico do detalhe: papel com o picote no topo e fio de 1px nos lados e embaixo, o dia em numeral de 18px e o mês abreviado em `meta`. É só visual: a data e a hora completas continuam na etiqueta "Em", que o leitor de tela lê e a cópia leva (decisão do dono, 11/11/2026; a mini-folha não tem o ano).

### Folha do dia (assinatura, login)
A folhinha de parede: papel de até 400px com sombra flutuante, aberto por uma argola preta de 24px, o mês e o ano, o dia em numeral da folha, o dia da semana, uma nota curta separada por um fio ("Um lote que vence hoje ainda pode sair. Amanhã, não.") e um rodapé aberto pelo picote com o nome do produto. Até 900px ela sai, e a folha da marca aparece invertida (tinta com o dia em branco) acima do formulário.

### Favicon
A folhinha em 32px: papel com contorno de tinta, faixa de tinta no topo e seis dias, com o de hoje em placa preta e os outros em Grafite. SVG avulso não lê o `theme.css`, por isso as cores estão escritas no arquivo, cada uma como cópia comentada de um token (`cor-superficie`, `cor-faixa`/`cor-texto`, `cor-borda-forte`). Mudou o token, muda o favicon.

### Avisos e estados
- **Aviso:** bloco de cantos de 2px no fundo claro da situação, ícone de 20px na cor de texto da situação e texto `body-small` em tinta. É o único elemento com fundo de situação. Erros da API ficam no topo do formulário, como aviso crítico; dentro de um aviso de atenção ou crítico, o anel de foco sobe para 3px.
- **Carregando, erro e vazio:** centralizados, com 48px de respiro em cima e embaixo, ícone de 20px e texto `body-small` em `texto-suave`. O vazio fica dentro de um painel; carregando e erro soltos na página ganham a mesma moldura (papel, borda de 1px, 2px de canto), para a troca de um estado para outro não fazer aparecer uma caixa nova. O erro leva a mensagem num aviso crítico e oferece "Tentar de novo"; o vazio diz o que falta e convida a uma ação.
- **Lista ocupada:** enquanto uma busca recarrega, a lista fica a 60% de opacidade, sem sumir.

### Motion
Só em resposta a uma ação: 140ms (`mov-rapido`) para hover, pressão, troca de cor e menu suspenso; 200ms (`mov-medio`) para diálogo, véu e gaveta; curva `cubic-bezier(0.2, 0, 0, 1)`. Diálogos e menus só aparecem com opacidade; a gaveta desliza pela esquerda. Com `prefers-reduced-motion`, as durações vão a zero e o indicador de carregando para de girar.

## Do's and Don'ts

### Do:
- **Do** usar só os tokens do tema para cor, fonte, tamanho, largura de fonte, raio, sombra, duração e dimensão, sem valores literais no CSS das páginas e sem `style={{}}`; a única cópia permitida é a do favicon, comentada token a token.
- **Do** manter uma única placa preta por tela (o botão principal, com verbo); o resto é secundário ou fantasma.
- **Do** circular a tinta (2px) a página atual e a opção escolhida, e dar ao foco pelo teclado outra forma: fundo `hover-neutro` com anel de 3px.
- **Do** escrever a situação com `<SinalSituacao>`: ícone de forma própria mais o texto que a nomeia.
- **Do** abrir tabelas e listas de dados com o fio de tinta de 2px e separar grupos de uma mesma folha com o picote.
- **Do** usar a classe `numeral` (62%, 800, tabular) em números grandes e algarismos tabulares em toda quantidade, saldo, data, contagem e código de barras.
- **Do** mostrar o código de barras sempre com `<CodigoDeBarras>`.
- **Do** começar a linha de apoio do Painel pelo dia em Brasília, que aparece já no carregando e no erro.
- **Do** garantir alvos de toque de 40px no computador e 44px no celular, e foco visível pelo teclado em tudo.
- **Do** usar ícones só do Tabler, com 18px (`icone-p`) ou 20px (`icone-m`) e `aria-hidden` quando há texto ao lado.
- **Do** levar o texto de atenção para `atencao-texto`; a cor do sinal (`atencao`) não serve para texto.
- **Do** escrever os cortes do layout com as variantes de mesmo valor do CSS antigo (`ate-640:`, `ate-900:`), para a tela mudar exatamente na mesma largura.
- **Do** dar folga embaixo da página e no `scroll-padding-bottom` a tudo o que fica fixo embaixo, para não cobrir conteúdo nem o foco.

### Don't:
- **Don't** usar cartões com sombra, ícone em quadradinho colorido, azul de SaaS, gradiente, vidro (desfoque de fundo), CAIXA ALTA, setas "→" em botões ou emojis.
- **Don't** pôr faixa colorida na borda de item, cartão ou aviso (`border-left` de situação), nem tingir o fundo de uma lista pela situação; só o aviso tem fundo de situação.
- **Don't** usar vermelho fora do crítico, nem âmbar e verde fora da situação.
- **Don't** dar placa preta ou fundo colorido à página atual ou à opção escolhida.
- **Don't** pôr sombra em nada que esteja na página, nem no hover; a sombra é do que flutua e da folha do dia.
- **Don't** usar peso 600 ou 700, nem o 800 fora do numeral, nem larguras de fonte além de 62% e 87,5%.
- **Don't** usar espaçamento fora da escala de 4px (`esp-0` a `esp-7`).
- **Don't** quebrar nomes no meio da palavra (`word-break: break-all`, `overflow-wrap: anywhere`), nem pôr outro texto na linha do nome numa lista.
- **Don't** animar nada que não seja resposta a uma ação do usuário.
- **Don't** misturar, num mesmo elemento, uma classe do CSS do projeto e um utilitário na mesma propriedade: o CSS sem camada sempre vence, e o utilitário fica sem efeito.

## Veredito da revisão (Fase de acabamento)

Revisão de 11/11/2026, branch `feat/acabamento-visual`, sobre as 16 telas em 320, 768 e 1280px, com os estados de carregando, erro e vazio e a gaveta.

**Revisão final da Impeccable (contra o direction contract): disposição `fix`, escopo parcial.**
- Primeira rodada: 2 correções materiais. O dia some do subtítulo no carregando e no erro; o nome do produto solto acima de "Entrar" no login do computador funciona como sobretítulo.
- Segunda rodada: as 2 correções foram pontuadas como resolvidas.
- O revisor também questionou o desenho do favicon. Decisão do dono: fica a grade de calendário (faixa de tinta no topo, dias em cinza, hoje em placa preta), porque em 16px a grade se lê como calendário, e a folha com o dia circulado parecia um botão.
- O revisor confirmou que tipografia, material, papel, faixa preta, menu circulado, linha de situações, fio de tinta, picote e erro centralizado correspondem ao contrato.
- Como a dívida abaixo continua faltando, nenhuma rodada fecha a superfície inteira com `ship`.

**ui-reviewer do projeto (9 larguras e zoom de 200%, com textos de 60 caracteres e saldo de 99.999):**
- Nenhum item crítico.
- 2 importantes, corrigidos: nome acessível do botão da conta começando pelo texto visível; Alertas sem troca de rótulo depois de a lista aparecer.
- Dos menores, foram corrigidos a moldura do carregando, a quantidade do lote em numeral, o favicon e a folga do `scroll-padding`. Os demais ficaram como estão, com aprovação do dono:
  - a lista de Usuários empilhada em 768px;
  - "Vencimento próximo" em duas linhas no filtro em 320px;
  - o espaço menor dentro dos grupos de formulário;
  - "Você" na linha do nome;
  - a contagem de alertas sozinha à direita em 768 e 1024px;
  - o texto "agora há pouco";
  - a janela de ajuste.

**Medições:** 48 combinações de tela e largura sem rolagem horizontal, sem alvo de toque pequeno, sem contraste abaixo de 4,5:1 e sem controle sem nome. Lint, build, 56 testes do Vitest e 19 do Playwright passaram.

Ficaram para o PR seguinte, por decisão do dono, como dívida do contrato de direção: a régua de vencimentos de 21 dias no Painel (que no celular vira a folha do mês), a barra inferior fixa até 900px (Painel, Entrada, Saída, Alertas e Mais, sem o botão de menu do topo) e a mini-folha de data nas últimas movimentações. **Quitada no PR dos componentes (veredito abaixo).**

## Veredito da revisão (PR dos componentes)

Revisão de 11/11/2026, branch `feat/painel-folhinha` (a partir de 3142ae9), sobre a régua de vencimentos, a barra inferior, a mini-folha de data e as capturas do README.

**Revisão final da Impeccable (contra o direction contract): disposição `ship`.** A dívida do contrato está quitada, e é a primeira vez que a superfície fecha com `ship`.
- Primeira rodada (`fix`): 3 correções materiais.
  - O cabeçalho da folha do mês dizia "hoje" na coluna que também tem as quartas seguintes. Agora mostra sempre o dia da semana, e hoje é a placa preta.
  - A data aparecia na mini-folha e de novo na etiqueta "Em". **Ficou como adaptação aceita**, por decisão do dono: a etiqueta é o único lugar acessível e copiável com a data e a hora completas, e deixar só a hora exigiria texto oculto colado ao visível.
  - As capturas de evidência em `.impeccable\review` eram do build anterior e foram refeitas.
- Segunda rodada (`fix`): as 3 resolvidas. Ela apontou uma regressão: a contagem de alertas no canto do item cobria o sino em 320px. Agora fica ao lado dele, na mesma linha.
- Terceira rodada: `ship`. O escopo foram o Painel, a régua e seus estados, a barra inferior, a gaveta e o Histórico do detalhe. O login e as outras telas seguem o veredito anterior e as medições abaixo.

**ui-reviewer do projeto (9 larguras e zoom de 200%, com textos de 60 caracteres e saldo de 99.999):** nenhum item crítico. Dos 9 importantes, 8 foram corrigidos:
- cabeçalho "hoje" na folha do mês;
- peso da folha do mês no celular (as linhas do mês e das quantidades só nas semanas que as usam);
- circulado com largura máxima;
- contagem da barra dentro do item, com "99+";
- anel de foco por dentro na barra;
- link "Ver a vencer";
- legenda com a amostra dentro da frase e a explicação fora do leitor de tela;
- hoje com vencimento também circulado.

Dos menores, foram corrigidos o comentário do corte da régua, o "Atualizar" que agora espera a régua e o comentário da área segura.

**Decisões do dono sobre o que sobrou (11/11/2026):**
- **Barra e cabeçalho fixos em telas baixas.** No zoom de 200% (640×400) e no celular deitado, os dois ocupam cerca de um terço da altura. Fica para depois do deploy, registrado em `docs\pendencias.md`. A solução proposta é soltar a barra no fim da página com `@media (max-height: 480px)`.
- **Aprovados como estão:**
  - a folha do mês começa em hoje, e não no domingo;
  - nenhum item fica circulado na barra em Minha conta (a página vem do menu da conta);
  - a data na mini-folha e na etiqueta "Em".
- **Menores que continuam como estão:**
  - a mini-folha se repete quando várias movimentações são do mesmo dia;
  - 4px a menos para o nome em 320px;
  - erro e carregando da régua sem a moldura do painel;
  - `viewport-fit=cover` desligado, então a área segura vale zero (sem ele, a página não passa sob o entalhe em paisagem).

**Proveniência:** as 8 capturas de `docs\imagens` foram geradas por `npm run capturas:readme` na branch `feat/painel-folhinha`, a partir de 3142ae9, em 11/11/2026, com os dados de demonstração. Cada uma tem o registro no arquivo ao lado (`<imagem>.webp.json`, gravado pelo `impeccable embed-prompt`), e o `embed-prompt --scan docs/imagens` dá 0 pendentes.

**Medições:**
- 48 combinações de tela e largura (16 telas em 320, 768 e 1280px) sem rolagem horizontal, sem alvo de toque pequeno, sem contraste abaixo de 4,5:1 e sem controle sem nome.
- Contraste das cores da régua e da barra, que a medição pula por serem `aria-hidden`, calculado à parte: o menor valor é 5,79:1.
- Lint, build, 70 testes do Vitest e 25 do Playwright passaram (estoque 9, barra inferior 6, responsividade 10).
