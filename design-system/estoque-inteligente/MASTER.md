# Design System Master File

> **Direção proposta. O estado atual está no DESIGN.md; tokens no theme.css.**

> **LÓGICA:** ao construir uma tela, leia antes `design-system/estoque-inteligente/pages/<tela>.md`.
> Se o arquivo existir, as regras dele **substituem** as deste Master. Senão, siga este Master.
> Nenhuma regra daqui vale sobre as regras nomeadas do `DESIGN.md`; onde houve conflito, a regra do `DESIGN.md` foi mantida e o conflito está registrado em [Conflitos registrados](#conflitos-registrados).

---

**Projeto:** Estoque Inteligente
**Gerado:** 2026-11-10 11:50:28 (UI/UX Pro Max 2.15.0), ajustado à mão no mesmo dia
**Consulta:** `"inventory management admin dashboard data tables" --design-system --persist -p "Estoque Inteligente" --density 8`
**Categoria:** Inventory & Stock Management (a consulta original devolveu "Smart Home/IoT Dashboard"; ver C-01)
**Botões de ajuste (dials):** Densidade 8/10 (densa, de painel), aplicada por escolha de passos da escala de 4px, não por tokens novos (ver C-06)

**Base verificada na skill:**
- Produto "Inventory & Stock Management": estilo Flat Design + Minimalism & Swiss Style; painel Real-Time Monitoring + Data-Dense; paleta "neutro funcional + semáforo de situação (verde/âmbar/vermelho)".
- Estilo "Flat Design": 2D, sem sombras, linhas limpas, foco na tipografia; transições simples de cor.
- Tipografia "Financial Trust": IBM Plex Sans em títulos e corpo, "excelente para dados".

---

## Regras globais

### Paleta

Os papéis da skill foram mapeados para as variáveis que já existem no `theme.css`. Não há segunda nomenclatura (`--color-*`): na migração para Tailwind, os nomes do tema continuam sendo a fonte. Valores em **negrito** são propostas de mudança. O detalhe de cada variável está em `MAPEAMENTO-THEME.md`.

| Papel | Valor | Variável (theme.css) |
|------|-----|--------------|
| Primária (ação, link, foco) | `#2F5D8A` | `--cor-primaria` |
| Texto sobre a primária | `#FFFFFF` (6,88:1) | `--cor-texto-inverso` |
| Primária hover / pressionada | `#1F4266` / `#183552` | `--cor-primaria-escura` / `--cor-primaria-pressionada` |
| Primária clara (página atual, hover do fantasma) | `#EAF1F8` | `--cor-primaria-clara` |
| Fundo da aplicação | `#F4F7FA` | `--cor-fundo` |
| Superfície (painel, campo) | `#FFFFFF` | `--cor-superficie` |
| Texto | `#1B2A3A` | `--cor-texto` |
| Texto secundário | `#5B6B7D` | `--cor-texto-suave` |
| Borda de painel | `#DCE3EB` | `--cor-borda` |
| Borda de campo | **`#7D8B9C`** (atual `#A9B6C4`) | `--cor-borda-forte` |
| Hover neutro | `#EEF2F6` | `--cor-hover-neutro` |
| Pressionado neutro | **`#E5EAF0`** (atual `#E2E8EF`) | `--cor-pressionado-neutro` |
| Desabilitado (fundo / texto) | `#E9EDF2` / **`#5D6C7E`** (atual `#8593A3`) | `--cor-desabilitado-fundo` / `--cor-desabilitado-texto` |
| Marcador do campo (placeholder) | **`var(--cor-texto-suave)`** (nova) | `--cor-marcador` |
| Situação ok (faixa / texto / fundo) | `#2E7D5B` / **`#2A7454`** / `#E8F4EE` | `--cor-ok` / `--cor-ok-texto` / `--cor-ok-fundo` |
| Situação atenção (faixa / texto / fundo) | `#B26B00` / `#8A5300` / `#FDF3E3` | `--cor-atencao` / `--cor-atencao-texto` / `--cor-atencao-fundo` |
| Situação crítica e perigo (faixa e texto / fundo) | `#B42318` / `#FCECEA` | `--cor-critico`, `--cor-critico-texto` / `--cor-critico-fundo` |
| Perigo hover / pressionado | `#921C13` / `#76170F` | `--cor-critico-escura` / `--cor-critico-pressionada` |
| Anel de foco | `#2F5D8A` (3px `#1B2A3A` sobre âmbar e vermelho) | `--cor-foco`, `--foco-anel-forte` |
| Sobreposição | `rgba(27, 42, 58, 0.45)`, sem desfoque | `--cor-sobreposicao` |

**Notas de cor:** um único destaque azul-ardósia sobre neutros frios do mesmo matiz; o semáforo verde/âmbar/vermelho só aparece na etiqueta de prateleira (Regra da Etiqueta). Sem tema escuro nesta direção (C-02).

#### Contraste: todo par texto/fundo com pelo menos 4,5:1

Pares em uso, já com as propostas aplicadas:

| Texto | Fundo | Contraste |
|---|---|---|
| Texto | fundo, superfície, hover, pressionado, primária clara, fundos de situação, desabilitado | 11,8 a 14,6:1 |
| Texto secundário | superfície / fundo / hover | 5,46 / 5,08 / 4,86:1 |
| Texto secundário | pressionado proposto `#E5EAF0` | 4,52:1 (era 4,43:1) |
| Texto secundário | primária clara / atenção / crítico / ok / desabilitado | 4,80 / 4,97 / 4,77 / 4,84 / 4,65:1 |
| Primária (link, fantasma) | superfície / fundo / fundos de situação | 6,88 / 6,40 / 6,0 a 6,26:1 |
| Primária escura | primária clara / primária clara pressionada | 9,08 / 8,25:1 |
| Branco | primária / escura / pressionada | 6,88 / 10,35 / 12,58:1 |
| Branco | crítico / crítico escuro / crítico pressionado | 6,57 / 8,76 / 11,05:1 |
| Texto de atenção `#8A5300` | fundo de atenção / superfície | 5,76 / 6,33:1 |
| Crítico | fundo crítico / superfície | 5,74 / 6,57:1 |
| Texto ok proposto `#2A7454` | fundo ok / superfície | 5,00 / 5,64:1 (era 4,43:1 sobre o fundo ok) |
| Texto desabilitado proposto `#5D6C7E` | fundo desabilitado / superfície | 4,57 / 5,37:1 (era 2,67 / 3,13:1) |
| Marcador (texto secundário) | superfície | 5,46:1 (hoje fica a critério do navegador) |

- **A cor da faixa de atenção (`#B26B00`) nunca é texto:** tem 4,20:1 sobre branco. Texto de atenção sempre em `--cor-atencao-texto`.
- **Botão primário com texto branco:** aprovado, 6,88:1 em repouso e mais nos estados de hover e pressionado.
- **Não-texto (3:1):** a borda do campo proposta tem 3,47:1 sobre branco e 3,23:1 sobre o fundo (hoje 2,06:1); faixas de situação, de 3,82 a 6,57:1; anel de foco, 6,88:1.

### Tipografia

- **Fonte única:** IBM Plex Sans (`--fonte`), pesos 400 e 500 apenas (Regra dos Dois Pesos).
- **Clima:** preciso, confiável, técnico sem frieza; algarismos tabulares em toda quantidade, saldo, data e contagem.
- **Google Fonts:** `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&display=swap` (já carregada no `index.html`).
- **Escala:** 13 / 14 / 16 / 18 / 24 / 32px (`--fs-1` a `--fs-6`). O menor tamanho continua sendo 13px (C-07).

### Espaçamento

*Densidade 8/10, aplicada dentro da escala de 4px existente (Regra da Escala de 4px).*

| Token | Valor | Uso na direção densa |
|-------|-------|-------|
| `--esp-1` | 4px | Espaço entre ícone e texto em etiquetas; vertical entre etiquetas |
| `--esp-2` | 8px | Espaço entre etiquetas; recuo vertical de célula de tabela |
| `--esp-3` | 12px | Recuo vertical de linha de lista; recuo de célula no celular |
| `--esp-4` | 16px | Recuo horizontal de célula de tabela em telas densas (hoje 24px, ver `pages/estoque.md`) |
| `--esp-5` | 24px | Espaço entre blocos da página; recuo de painel |
| `--esp-6` | 32px | Recuo do conteúdo no computador |
| `--esp-7` | 48px | Respiro de estados vazio, erro e carregando |

### Profundidade

| Nível | Valor | Uso |
|-------|-------|-------|
| `--sombra-flutuante` | `0 8px 24px rgba(27, 42, 58, 0.14)` | Só o que flutua: diálogo, gaveta, menu suspenso, lista de opções |

Painéis, cartões, linhas e botões não têm sombra, nem no hover (Regra do Que Flutua). A escala de sombras de quatro níveis da skill foi descartada (C-04).

---

## Especificação dos componentes

### Botões

```css
/* Primário: um por tela, com verbo */
.botao--primaria {
  min-height: var(--alvo-min);            /* 40px; 44px até 900px */
  padding: var(--esp-0) var(--esp-4);
  border-radius: var(--raio-p);           /* 6px */
  background: var(--cor-primaria);
  color: var(--cor-texto-inverso);        /* 6,88:1 */
  font-size: var(--fs-2);
  font-weight: var(--peso-medio);         /* 500, nunca 600 */
  transition: background-color var(--mov-rapido) var(--mov-curva);
  cursor: pointer;
}
.botao--primaria:hover { background: var(--cor-primaria-escura); }  /* sem translateY nem opacidade */
.botao--primaria:active { background: var(--cor-primaria-pressionada); }
.botao:focus-visible { outline: var(--foco-anel); outline-offset: var(--foco-distancia); }

/* Secundário: fundo branco e borda de painel */
.botao--secundaria { background: var(--cor-superficie); border: var(--borda); color: var(--cor-texto); }
.botao--secundaria:hover { background: var(--cor-hover-neutro); border-color: var(--cor-borda-forte); }

/* Desabilitado: o texto também passa de 4,5:1 */
.botao:disabled { background: var(--cor-desabilitado-fundo); color: var(--cor-desabilitado-texto); cursor: not-allowed; }
```

### Painéis (no lugar de "cards")

```css
.painel {
  background: var(--cor-superficie);
  border: var(--borda);                   /* 1px, sem sombra */
  border-radius: var(--raio-m);           /* 10px */
}
/* Painel cujos itens levam etiqueta: lado esquerdo reto (Regra do Canto Reto) */
.painel--etiquetado {
  border-left: 0;
  border-radius: 0 var(--raio-m) var(--raio-m) 0;
}
```

### Campos

```css
.campo__caixa {
  min-height: var(--alvo-min);
  border: var(--borda-largura) solid var(--cor-borda-forte);  /* proposta: #7D8B9C, 3,47:1 */
  border-radius: var(--raio-p);
  background: var(--cor-superficie);
}
.campo__caixa:has(:focus) { border-color: var(--cor-primaria); outline: var(--foco-anel); outline-offset: 0; }
.campo__entrada { font-size: var(--fs-3); }                /* 16px: o celular não amplia ao focar */
.campo__entrada::placeholder { color: var(--cor-marcador); opacity: 1; }  /* nova: 5,46:1 */
```

### Diálogos

```css
.sobreposicao { background: var(--cor-sobreposicao); }    /* sem backdrop-filter */
.dialogo {
  width: min(var(--largura-dialogo), calc(100vw - 2 * var(--esp-4)));
  max-height: calc(100dvh - 2 * var(--esp-4));
  padding: var(--esp-5);
  border-radius: var(--raio-m);
  background: var(--cor-superficie);
  box-shadow: var(--sombra-flutuante);    /* o único lugar com sombra */
}
```

### Tabelas densas (novo na direção)

```css
/* Cabeçalho fixo ao rolar listas longas (até 200 itens por página, RN-51) */
.tabela thead th { position: sticky; top: var(--altura-cabecalho); background: var(--cor-superficie); }
/* Destaque de linha só quando a linha inteira é um link; muda o fundo, nunca a elevação */
.tabela tr[data-clicavel]:hover td { background: var(--cor-hover-neutro); }
```

---

## Estilo

**Estilo:** Flat Design + Minimalism & Swiss Style, aplicado como "A Prateleira Etiquetada" (DESIGN.md).

**Palavras-chave:** plano, sem sombras, linhas finas, tipografia antes de enfeite, semáforo de situação só na etiqueta, densidade de dados legível.

**Indicado para:** painéis operacionais, listas de estoque e lotes, formulários de balcão no celular.

**Efeitos:** troca de cor de fundo no hover (120ms), opacidade e deslize curtos em diálogo e gaveta (200ms); nada se move sem ação do usuário; tudo vai a zero com `prefers-reduced-motion`.

### Padrão de página: painel administrativo

O padrão da skill ("Real-Time / Operations Landing": herói, demonstração, chamada para teste) é de página de venda e foi substituído (C-03).

- **Estrutura:** cabeçalho fixo de 56px (marca à esquerda, usuário à direita) + menu lateral de 240px + conteúdo de até 1120px com recuo de 32px. Até 900px, o menu vira gaveta.
- **Cabeçalho da página:** título (`h1`, 24px) e linha de apoio à esquerda; ações à direita (no máximo um botão primário), quebrando para baixo no celular.
- **Indicadores:** um único painel dividido em quatro situações, cada uma com sua etiqueta, título, número de 32px e descrição. Não são quatro cartões soltos (C-08).
- **Conteúdo:** listas e tabelas dentro de painéis, com o nome em linha própria e os metadados em etiquetas. No celular, a tabela vira lista empilhada por container query (48rem).
- **Tempo real honesto:** mostrar "Situação do estoque às HH:MM" e o botão "Atualizar". Nada de rótulo "ao vivo" sem atualização automática (princípio "A tela não mente").
- **Larguras de revisão:** 320, 360, 375, 390, 414, 768, 1024, 1280 e 1440px e zoom de 200%, sem rolagem horizontal da página.

---

## Anti-padrões (não usar)

- ❌ **Vidro (glassmorphism) e desfoque de fundo** em qualquer camada (C-04)
- ❌ **Sombra em painel, cartão, linha ou botão**, inclusive no hover; hover com `translateY` ou `scale`
- ❌ **Verde como cor de ação**: verde é a situação "em dia" (C-05)
- ❌ **Pesos 600 e 700**, fonte monoespaçada em títulos (C-07)
- ❌ **Texto abaixo de 13px**, linhas de tabela abaixo do alvo de toque (40/44px)
- ❌ **Espaçamento de 2px** ou qualquer valor fora de `--esp-1` a `--esp-7`
- ❌ **Situação só por cor**: toda faixa vem com o nome da situação em texto
- ❌ **Rolagem horizontal da página** para caber tabela larga
- ❌ **Edição ou exclusão em lote** de movimentações, produtos ou fornecedores (nada se apaga; correções por ajuste registrado)
- ❌ **Gradientes, CAIXA ALTA, emojis, setas "→" em botões**
- ❌ **Ícones de outro conjunto**: só Tabler (`@tabler/icons-react`), com `aria-hidden` ao lado de texto

---

## Conflitos registrados

Onde a recomendação da skill contrariou uma regra do `DESIGN.md` ou do `PRODUCT.md`, a regra do projeto foi mantida.

| ID | Recomendação da skill | Regra mantida | Decisão |
|---|---|---|---|
| C-01 | Categoria "Smart Home/IoT Dashboard" | Produto real: controle de estoque com lotes e validade | Substituída pela categoria "Inventory & Stock Management", verificada com a busca `--domain product` |
| C-02 | Tema escuro (fundo `#0F172A`, texto `#F8FAFC`) | DESIGN.md: o sistema é só claro | Mantido claro; tema escuro fica fora desta direção |
| C-03 | Padrão "Real-Time / Operations Landing" (herói, CTA de teste) | É uma aplicação logada, não uma página de venda | Substituído pelo layout de painel administrativo acima |
| C-04 | Glassmorphism, desfoque de 10 a 20px, sombras sm/md/lg/xl, cartão que sobe no hover | Regra do Que Flutua; Don't do DESIGN.md (vidro) | Plano, com sombra só em diálogo, gaveta, menu suspenso e lista de opções |
| C-05 | Destaque/CTA verde `#22C55E` com texto escuro | Regra da Voz Única; Regra da Etiqueta (verde é situação) | Ação continua no Azul Ardósia |
| C-06 | Densidade 8: escala de 2 a 32px (`--space-xs` de 2px) | Regra da Escala de 4px | Escala mantida; a densidade vem de usar passos menores (`--esp-2` a `--esp-4`) em tabelas |
| C-07 | Fira Code nos títulos e Fira Sans no corpo, pesos de 300 a 700; texto de 12px em telas densas | Regra dos Dois Pesos; menor texto de 13px; Brand do PRODUCT.md (clareza em pt-BR) | IBM Plex Sans 400/500, já recomendada pela própria skill para dados |
| C-08 | "Cards de indicadores" em grade | Don't do DESIGN.md (grade de cartões idênticos); Painel de situações | Um único painel dividido pelas etiquetas |
| C-09 | Raios de 8, 12 e 16px | Shapes do DESIGN.md (6 e 10px); Regra do Canto Reto | Mantidos 6 e 10px; lado da etiqueta sempre reto |
| C-10 | Anel de foco branco (`#FFFFFF`) | Foco visível (PRODUCT.md); anel atual de 6,88:1 | Mantido o anel azul, e o forte azul-noite sobre âmbar e vermelho |
| C-11 | Linha de tabela de 36px | Alvo de toque de 40/44px (PRODUCT.md: operação no celular) | Linhas com pelo menos o alvo de toque |
| C-12 | Tabela larga com rolagem horizontal | PRODUCT.md: sem rolagem horizontal a partir de 320px | Lista empilhada por container query |
| C-13 | Transições de 150 a 300ms em todo estado | DESIGN.md: 120ms (`--mov-rapido`) e 200ms (`--mov-medio`) | Mantidos; diferença pequena e sem regra nomeada envolvida, registrada só por transparência |
| C-14 | Seleção múltipla e edição em lote | PRODUCT.md: nada se apaga, movimentações nunca são editadas | Não adotado |
| C-15 | Ícones Heroicons/Lucide | Skill `frontend-page`: só Tabler | Mantido Tabler |
| C-16 | Contraste baixo intencional do texto desabilitado (DESIGN.md, 2,67:1) | Pedido do dono: 4,5:1 em todo par texto/fundo | **Diverge do DESIGN.md atual**: proposto `#5D6C7E`. Se for aprovado e aplicado, o DESIGN.md será regerado |

---

## Checklist antes de entregar

- [ ] Só variáveis do tema; nenhum valor literal de cor, espaço, raio ou duração
- [ ] Um único botão primário por tela, com verbo
- [ ] Toda situação com etiqueta e nome em texto; lado da etiqueta reto
- [ ] Nenhuma sombra fora de diálogo, gaveta, menu suspenso e lista de opções
- [ ] Só pesos 400 e 500; nada abaixo de 13px; algarismos tabulares em números
- [ ] Todo par texto/fundo com pelo menos 4,5:1 (tabela acima); bordas de campo com pelo menos 3:1
- [ ] Ícones Tabler com `aria-hidden` ao lado de texto; `cursor: pointer` em tudo que é clicável
- [ ] Foco visível pelo teclado; `prefers-reduced-motion` respeitado
- [ ] Alvos de 40px (44px até 900px); sem rolagem horizontal em 320, 360, 375, 390, 414, 768, 1024, 1280 e 1440px e no zoom de 200%
- [ ] Estados de carregando, erro (diz o que fazer) e vazio (convida a uma ação)
