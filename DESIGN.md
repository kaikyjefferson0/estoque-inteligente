---
name: Estoque Inteligente
description: Controle de estoque com lotes e validade, em que a tela fica calma e só a etiqueta da situação chama o olho.
colors:
  primaria: "#2f5d8a"
  primaria-escura: "#1f4266"
  primaria-pressionada: "#183552"
  primaria-clara: "#eaf1f8"
  primaria-clara-pressionada: "#dbe7f3"
  superficie: "#ffffff"
  fundo: "#f4f7fa"
  texto: "#1b2a3a"
  texto-suave: "#5b6b7d"
  texto-inverso: "#ffffff"
  borda: "#dce3eb"
  borda-forte: "#a9b6c4"
  hover-neutro: "#eef2f6"
  pressionado-neutro: "#e2e8ef"
  desabilitado-fundo: "#e9edf2"
  desabilitado-texto: "#8593a3"
  ok: "#2e7d5b"
  ok-texto: "#2e7d5b"
  ok-fundo: "#e8f4ee"
  atencao: "#b26b00"
  atencao-texto: "#8a5300"
  atencao-fundo: "#fdf3e3"
  critico: "#b42318"
  critico-texto: "#b42318"
  critico-fundo: "#fcecea"
  critico-escura: "#921c13"
  critico-pressionada: "#76170f"
  sobreposicao: "rgba(27, 42, 58, 0.45)"
typography:
  numero-situacao:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: 1.1
    fontFeature: "tnum"
  headline:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.25
  title:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.25
  body:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  body-small:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
  meta:
    fontFamily: "IBM Plex Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.55
    fontFeature: "tnum"
rounded:
  p: "6px"
  m: "10px"
spacing:
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
    backgroundColor: "{colors.primaria-clara}"
    textColor: "{colors.primaria-escura}"
  menu-contagem:
    backgroundColor: "{colors.atencao-fundo}"
    textColor: "{colors.atencao-texto}"
    typography: "{typography.meta}"
    rounded: "{rounded.p}"
    padding: "0 8px"
  segmento-escolhido:
    backgroundColor: "{colors.primaria}"
    textColor: "{colors.texto-inverso}"
    typography: "{typography.label}"
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

> **Fonte dos tokens:** hoje todos os valores moram em `frontend\src\styles\theme.css`, a única fonte de cores, espaçamentos, fontes, raios, sombras e durações; cada chave do frontmatter acima corresponde a uma variável dele (`primaria` → `--cor-primaria`, `p` → `--raio-p`, `esp-4` → `--esp-4`). O `PRODUCT.md` registra a migração da estilização para Tailwind (branch `feat/tailwind-ui`). Ela deve manter exatamente estes tokens, com a mesma fonte única, e atualizar esta nota quando definir onde eles passam a morar.

## Overview

**Creative North Star: "A Prateleira Etiquetada"**

Numa gôndola bem organizada, as prateleiras são neutras e quem fala é a etiqueta: preço, validade, aviso de "últimas unidades". O Estoque Inteligente segue a mesma lógica. A superfície é calma, branca sobre um cinza azulado muito leve, com bordas finas e texto em azul-noite. A cor de situação (verde conferido, âmbar de validade, vermelho de vencido) só aparece numa faixa de 4px na esquerda do item, a **etiqueta de prateleira**, e no fundo claro do item com problema. Quando nada precisa de atenção, a tela fica quieta; quando algo precisa, o olho vai direto para lá.

O clima é **calmo, preciso e honesto**. Calmo, porque é uma ferramenta de trabalho usada no meio do expediente, muitas vezes no celular e com uma mão. Preciso, porque números se alinham por coluna, datas e quantidades nunca se separam da unidade e cada metadado tem seu lugar fixo. Honesto, porque nada é decorativo: nenhum número de enfeite, nenhum gradiente, nenhuma sombra fingindo profundidade, nenhum estado que a regra de negócio não confirma. A densidade é média: linhas de lista com ar suficiente para o toque (alvos de 40px no computador, 44px no celular), sem virar painel de cartões espaçados.

O sistema é só claro, sem tema escuro. Um único azul, o Azul Ardósia, carrega toda a identidade: marca, ação primária, link, página atual e foco. Até os neutros são puxados para o mesmo matiz (cerca de 250° em OKLCH), por isso o cinza nunca parece morto.

**Key Characteristics:**
- Superfícies planas com borda de 1px; sombra só no que flutua sobre a página.
- Um único destaque (Azul Ardósia) e três cores de situação que só aparecem na etiqueta.
- IBM Plex Sans em dois pesos (400 e 500); hierarquia por tamanho e cor, nunca por negrito pesado.
- Escala de espaçamento de 4px, sem exceções.
- Etiqueta de prateleira: faixa de 4px à esquerda, com o canto daquele lado sempre reto.
- Movimento curto (120 a 200ms) e só em resposta a uma ação.

## Colors

Paleta contida: um azul-ardósia como única voz, neutros frios do mesmo matiz e três cores de situação que só falam quando há algo a dizer.

### Primary
- **Azul Ardósia** (`primaria`): botão primário, link, página atual no menu, opção escolhida nos segmentos, marcação das caixas e o anel de foco. É também a faixa da marca no cabeçalho e no favicon. Branco sobre ele tem contraste de 6,9:1.
- **Azul Ardósia Escuro** (`primaria-escura`): hover do primário e dos links; texto do item atual do menu e da marca no login.
- **Azul Ardósia Pressionado** (`primaria-pressionada`): estado `:active` do botão primário.
- **Névoa Ardósia** (`primaria-clara`): fundo do item atual do menu, hover do botão fantasma, opção destacada na lista com busca. A versão pressionada (`primaria-clara-pressionada`) é o `:active` desses mesmos elementos.

### Secondary
- **Verde Conferido** (`ok`, `ok-fundo`): situação em dia. Faixa da etiqueta e o fundo claro quando um item resolvido precisa ser destacado. Na faixa e como texto sobre branco usa o mesmo valor (`ok-texto`, 5,0:1).
- **Âmbar Validade** (`atencao`, `atencao-texto`, `atencao-fundo`): estoque baixo e lote perto do vencimento; também a contagem de alertas no menu. A cor da faixa (`atencao`) tem só 4,2:1 sobre branco, por isso o texto usa a versão mais escura (`atencao-texto`, 5,8:1 sobre o fundo âmbar).
- **Vermelho Vencido** (`critico`, `critico-texto`, `critico-fundo`): sem estoque, lote vencido, erro de formulário e ação destrutiva. `critico-escura` e `critico-pressionada` são o hover e o `:active` do botão de perigo.

### Neutral
- **Cinza Gôndola** (`fundo`): fundo da aplicação, atrás de todos os painéis.
- **Branco Superfície** (`superficie`): painéis, cabeçalho, menu lateral, campos, diálogos e etiquetas de metadado.
- **Tinta Azul-Noite** (`texto`): todo texto principal (13,6:1 sobre o fundo).
- **Grafite Suave** (`texto-suave`): rótulos secundários, metadados, descrições, ícones em repouso e itens do menu fora da página atual (5,5:1 sobre branco).
- **Branco Inverso** (`texto-inverso`): texto sobre o Azul Ardósia e sobre o vermelho do botão de perigo.
- **Linha de Prateleira** (`borda`): borda de 1px de painéis, divisórias entre linhas e o contorno das etiquetas de metadado.
- **Linha Firme** (`borda-forte`): contorno dos campos em repouso e hover do botão secundário. Campos precisam de um contorno mais firme que os painéis para serem reconhecidos como algo que se preenche.
- **Toque Neutro** e **Pressão Neutra** (`hover-neutro`, `pressionado-neutro`): hover e `:active` de tudo o que não é primário (menu, botão-ícone, botão secundário, item de menu suspenso).
- **Fundo Bloqueado** e **Texto Bloqueado** (`desabilitado-fundo`, `desabilitado-texto`): controles desabilitados. O contraste baixo (2,7:1) é intencional e só vale para o que não aceita ação; um valor salvo que precisa ser lido fica em `texto-suave`.
- **Sobreposição** (`sobreposicao`): véu azul-noite a 45% atrás de diálogos e da gaveta.

### Named Rules
**A Regra da Etiqueta.** A cor de situação aparece só na faixa da etiqueta de prateleira, no fundo claro do item com problema e no texto que nomeia a situação. Nunca em título de página, botão comum, ícone decorativo ou borda de painel.

**A Regra da Voz Única.** O Azul Ardósia é o único destaque. Cada tela tem um só botão primário; as outras ações são secundárias ou fantasmas.

**A Regra da Cor que Não Fala Sozinha.** Toda situação vem acompanhada de texto ("Estoque baixo", "Vencido", "Sem estoque") e, no item, de um rótulo de tipo. A cor reforça, nunca é a única informação.

## Typography

**Display Font:** IBM Plex Sans (com system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** IBM Plex Sans (a mesma família)

**Character:** Uma única família humanista de origem técnica, carregada só nos pesos 400 e 500. Tem a precisão de um formulário de conferência sem a frieza de uma fonte de terminal, e os números tabulares se alinham bem em colunas de saldo.

### Hierarchy
- **Número de situação** (500, 2rem, 1.1, algarismos tabulares): os quatro números do painel (estoque baixo, sem estoque, a vencer, vencidos). É o maior texto do sistema e só aparece ali.
- **Headline** (500, 1.5rem, 1.25): título da página (`h1`), um por tela, com uma linha de apoio em `body-small` e `texto-suave` logo abaixo.
- **Title** (500, 1.125rem, 1.25): título de seção (`h2`), cabeçalho de painel e título de diálogo.
- **Body** (400, 1rem, 1.55): texto corrido, valores digitados nos campos, nomes em listas (em 500). Texto longo para em 68ch.
- **Body small** (400, 0.875rem, 1.55): textos de apoio, dicas e erros de campo, itens do menu, avisos, paginação.
- **Label** (500, 0.875rem, 1.25): rótulos de campo, texto de botão, títulos das situações do painel, cabeçalhos de tabela (estes em `texto-suave`).
- **Meta** (400, 0.8125rem, 1.55, algarismos tabulares): etiquetas de metadado (tipo, lote, validade, autor, data) e descrições curtas abaixo de números.

### Named Rules
**A Regra dos Dois Pesos.** Só existem 400 e 500. A hierarquia vem do tamanho e da cor (`texto` contra `texto-suave`), nunca de 600 ou 700.

**A Regra da Coluna Alinhada.** Quantidade, saldo, data e contagem usam algarismos tabulares (classe `numero`). Número e unidade nunca se separam: "500 g" leva espaço inseparável.

**A Regra da Caixa Normal.** Nenhum texto em CAIXA ALTA, nem em rótulo pequeno.

## Layout

A área logada tem um **cabeçalho fixo** de 56px (marca à esquerda, usuário à direita), um **menu lateral** de 240px, também fixo, e o **conteúdo** com recuo de 32px e largura máxima de 1120px. Tudo se alinha à esquerda; nada é centralizado na área logada. O login é a exceção: um único painel de 400px no centro da tela.

Cada página é uma coluna com espaço de 24px entre blocos. No topo vem o **cabeçalho da página**: título e linha de apoio à esquerda, ações à direita, alinhados pela base e quebrando para baixo quando não cabem. Formulários ficam numa coluna de até 560px, com o rótulo acima do campo. Diálogos têm 440px e menus suspensos começam em 240px.

**Ritmo:** margem, recuo e espaço entre itens só da escala de 4px (`esp-1` a `esp-7`, de 4 a 48px). Dentro do painel, as linhas de lista usam 12px na vertical e 24px na horizontal; os cabeçalhos de painel, 16px por 24px.

**Responsivo:**
- **≤ 900px:** o menu lateral vira uma gaveta (288px, até 85% da largura) aberta pelo botão do cabeçalho; os alvos de toque sobem de 40 para 44px; o conteúdo usa recuo de 24px por 16px; o painel de situações passa de 4 para 2 colunas.
- **≤ 640px:** painéis e formulários reduzem o recuo interno para 16px.
- **≤ 480px:** as ações da página descem para baixo do título; o perfil do usuário some do cabeçalho.
- **≤ 400px:** o nome do usuário vira um ícone; os botões do diálogo empilham com largura total, com a ação principal em cima.
- **Tabelas** viram listas empilhadas por container query, quando o próprio painel tem menos de 48rem: nome numa linha própria, as outras células como etiquetas de metadado embaixo e a ação no fim.

Larguras de revisão obrigatórias: 320, 360, 375, 390, 414, 768, 1024, 1280 e 1440px, mais o zoom de 200%. Em nenhuma delas pode haver rolagem horizontal da página.

### Named Rules
**A Regra da Escala de 4px.** Nenhum espaçamento fora de `esp-1` a `esp-7`. Um valor que não está na escala é um erro, não um ajuste fino.

**A Regra do Nome na Própria Linha.** Em listas, o nome do item fica sozinho na sua linha (no máximo 2 linhas, com reticências); só uma quantidade pode ficar à direita dele. O resto vai embaixo, como etiquetas.

## Elevation & Depth

O sistema é **plano**. Tudo o que está na página (painéis, cabeçalho, menu lateral, campos) fica no mesmo plano e se separa por bordas de 1px na Linha de Prateleira e pelo contraste entre o Branco Superfície e o Cinza Gôndola. Profundidade de verdade só existe no que flutua sobre a página, e esse é o único lugar com sombra.

### Shadow Vocabulary
- **Flutuante** (`box-shadow: 0 8px 24px rgba(27, 42, 58, 0.14)`): diálogo de confirmação, gaveta do celular, menu suspenso e lista de opções da seleção com busca. Nada mais.

### Named Rules
**A Regra do Que Flutua.** Nada que está na página tem sombra, nem no hover. A sombra flutuante é só para camadas que se sobrepõem ao conteúdo (diálogo, gaveta, menu suspenso, lista de opções). O hover de um elemento da página muda o fundo, nunca a elevação.

## Shapes

Cantos pouco arredondados, em dois tamanhos: **6px** (`p`) para controles (botões, campos, itens de menu, etiquetas de metadado, avisos, segmentos) e **10px** (`m`) para painéis, diálogos e menus suspensos. Não há formas de pílula nem círculos, exceto o indicador de carregando. Bordas são sempre de 1px; a única borda grossa do sistema é a etiqueta de prateleira, de 4px.

### Named Rules
**A Regra do Canto Reto.** O lado que leva a etiqueta de prateleira nunca é arredondado. Painéis cujos itens têm etiqueta (situações do painel, lista de alertas) dispensam a borda esquerda e arredondam só o lado direito (`0 10px 10px 0`), porque é ali que as faixas ficam.

## Components

Firmes e contidos: o alvo de toque é generoso, os cantos são discretos e a firmeza vem do tamanho e da clareza, não de enfeite.

### Buttons
- **Shape:** cantos levemente arredondados (6px); altura mínima de 40px (44px no celular); recuo horizontal de 16px; texto em `label`, ícone opcional de 18px à esquerda, com 8px de espaço.
- **Primário:** fundo Azul Ardósia, texto branco. Um por tela, com verbo ("Registrar entrada", "Registrar saída").
- **Hover / Active:** primário escurece para `primaria-escura` e depois `primaria-pressionada`; transição de 120ms em fundo, borda e cor.
- **Focus:** anel de 2px no Azul Ardósia, afastado 2px (`:focus-visible`, só pelo teclado).
- **Secundário:** fundo branco com borda na Linha de Prateleira e texto azul-noite; no hover, Toque Neutro e borda na Linha Firme.
- **Fantasma:** sem fundo, texto Azul Ardósia; no hover, Névoa Ardósia. É o padrão para ações de apoio no cabeçalho da página ("Atualizar").
- **Perigo:** fundo Vermelho Vencido, texto branco; só em confirmações de ação irreversível.
- **Desabilitado:** Fundo Bloqueado com Texto Bloqueado, cursor de bloqueio.
- **Carregando:** mantém a cor da variante (um pouco mais escura) e troca o texto ("Registrando…"), para não parecer desabilitado.
- **Botão-ícone:** quadrado do tamanho do alvo de toque, sem fundo, ícone de 20px em `texto-suave`; no hover, Toque Neutro. Usado no menu, em fechar e em mostrar senha.

### Chips (etiquetas de metadado)
- **Style:** fundo branco, borda de 1px na Linha de Prateleira, cantos de 6px, recuo de 8px, texto `meta` em `texto-suave`. Ícone opcional de 18px (o tipo da movimentação).
- **Comportamento:** ficam numa linha própria abaixo do nome e passam para a linha de baixo quando não cabem, com 4px de espaço vertical e 8px horizontal. O rótulo é oculto (só para leitor de tela) e o valor aparece; nunca encostam nem se sobrepõem.
- **Contagem do menu:** variante em Âmbar Validade (fundo `atencao-fundo`, texto `atencao-texto`, peso 500), à direita do rótulo "Alertas".

### Cards / Containers (painel)
- **Corner Style:** 10px.
- **Background:** Branco Superfície sobre o Cinza Gôndola.
- **Shadow Strategy:** nenhuma (ver A Regra do Que Flutua).
- **Border:** 1px na Linha de Prateleira; cabeçalho do painel separado por outra linha de 1px.
- **Internal Padding:** cabeçalho em 16px por 24px; linhas de lista em 12px por 24px; no celular, 12px por 16px.
- Não há grade de cartões repetidos: o conteúdo é uma lista ou tabela dentro de um painel.

### Inputs / Fields
- **Style:** rótulo `label` acima; caixa branca com borda de 1px na Linha Firme, cantos de 6px, altura do alvo de toque, recuo de 12px, texto `body`. O acessório (mostrar senha, abrir lista) fica dentro da caixa.
- **Hover:** a borda escurece para `texto-suave`.
- **Focus:** borda Azul Ardósia mais anel de 2px colado na caixa.
- **Error:** borda e anel em Vermelho Vencido em todos os estados (repouso, hover e foco); mensagem em `body-small` `critico-texto` abaixo, ligada por `aria-describedby`; o erro some assim que a pessoa edita.
- **Disabled / somente leitura:** Fundo Bloqueado com a borda clara.
- **Select:** nativo, com a aparência do campo e uma seta de 18px na mesma célula.
- **Seleção com busca:** lista flutuante abaixo do campo (sombra flutuante, até 320px de altura); opção destacada em Névoa Ardósia.

### Navigation
- **Menu lateral:** links em `body-small` e `texto-suave` com ícone de 20px e 12px de espaço, altura do alvo de toque, cantos de 6px.
- **Hover / Active:** Toque Neutro com texto azul-noite; `:active` em Pressão Neutra.
- **Página atual:** Névoa Ardósia com texto `primaria-escura` em 500.
- **Cabeçalho:** branco com linha inferior; a marca é uma faixa vertical de 4px por 20px no Azul Ardósia seguida de "Estoque Inteligente" em 500, um eco da etiqueta de prateleira. O usuário abre um menu suspenso, cuja seta gira 180° quando ele está aberto.
- **Celular (≤ 900px):** o menu vira gaveta pela esquerda (entra deslizando em 200ms), com sombra flutuante e véu de sobreposição.

### Segmentos
Escolha única entre poucas opções (rádios nativos): uma faixa com borda de 1px e cantos de 6px, opções separadas por linhas de 1px, texto `label` em `texto-suave`. A opção escolhida ganha fundo Azul Ardósia com texto branco; no foco, o anel fica branco e por dentro, para aparecer sobre o azul.

### Avisos e estados
- **Aviso:** bloco de cantos de 6px no fundo claro da situação, ícone de 20px na cor de texto da situação e texto `body-small` azul-noite. Erros da API ficam no topo do formulário, como aviso crítico.
- **Carregando, erro e vazio:** centralizados no painel, com 48px de respiro, ícone de 20px e texto `body-small` em `texto-suave`. O erro diz o que fazer e oferece "Tentar de novo". O vazio diz o que falta e convida a uma ação com um botão.
- **Lista ocupada:** enquanto uma busca recarrega, a lista fica a 60% de opacidade, sem sumir.

### Etiqueta de prateleira (assinatura)
Faixa de 4px na borda esquerda do item, na cor da situação (`ok`, `atencao` ou `critico`), com o canto daquele lado reto. Itens com problema também ganham o fundo claro da situação (`atencao-fundo` ou `critico-fundo`), e o texto que nomeia a situação usa a cor de texto dela. Um alerta resolvido perde o fundo e fica com a faixa neutra. Dentro de um item âmbar ou vermelho, o anel de foco fica mais grosso (3px) e azul-noite, para não sumir na cor.

### Painel de situações (assinatura)
Os quatro indicadores do painel (estoque baixo, sem estoque, a vencer, vencidos) formam **um único painel dividido**, e não quatro cartões: cada célula tem sua etiqueta de prateleira, o título em `label`, o número de situação e uma descrição em `meta`. Com o número em zero, a etiqueta fica verde, a célula branca e o número em `texto-suave` ("Nada pendente"); com o número acima de zero, a célula ganha o fundo e a cor de texto da situação.

### Motion
Só em resposta a uma ação: 120ms (`mov-rapido`) para hover, pressão e troca de cor; 200ms (`mov-medio`) para entrada de diálogo, véu e gaveta; curva `cubic-bezier(0.2, 0, 0, 1)`. Diálogos e menus só aparecem com opacidade; a gaveta desliza pela esquerda. Com `prefers-reduced-motion`, as durações vão a zero e o indicador de carregando para de girar.

## Do's and Don'ts

### Do:
- **Do** usar só os tokens do tema para cor, fonte, tamanho, raio, sombra, duração e dimensão, sem valores literais no CSS das páginas e sem `style={{}}`.
- **Do** manter um único botão primário por tela, com verbo; o resto é secundário ou fantasma.
- **Do** marcar itens de estoque, lotes e alertas com a etiqueta de prateleira (`etiqueta--ok`, `--atencao`, `--critico`), com o lado esquerdo reto, e deixar o resto da tela calmo.
- **Do** escrever o nome da situação junto da cor ("Vencido", "Estoque baixo").
- **Do** usar algarismos tabulares em toda quantidade, saldo, data e contagem.
- **Do** garantir alvos de toque de 40px no computador e 44px no celular, e foco visível pelo teclado em tudo.
- **Do** usar ícones só do Tabler, com 18px (`icone-p`) ou 20px (`icone-m`) e `aria-hidden` quando há texto ao lado.
- **Do** levar o texto de atenção para `atencao-texto` (#8a5300); a cor da faixa (#b26b00) não serve para texto.

### Don't:
- **Don't** usar gradiente, vidro (desfoque de fundo), grade de cartões idênticos com sombra, CAIXA ALTA, setas "→" em botões ou emojis.
- **Don't** pôr sombra em nada que esteja na página, nem no hover; sombra é só para diálogo, gaveta, menu suspenso e lista de opções.
- **Don't** usar peso 600 ou 700; a hierarquia vem do tamanho e da cor.
- **Don't** usar âmbar ou vermelho fora da etiqueta, dos avisos, dos erros e da ação de perigo, nem como enfeite.
- **Don't** arredondar o lado esquerdo de um contêiner que leva etiqueta.
- **Don't** usar espaçamento fora da escala de 4px (`esp-1` a `esp-7`).
- **Don't** quebrar nomes no meio da palavra (`word-break: break-all`, `overflow-wrap: anywhere`), nem pôr outro texto na linha do nome numa lista.
- **Don't** animar nada que não seja resposta a uma ação do usuário.
