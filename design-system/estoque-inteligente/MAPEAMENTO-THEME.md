# Mapeamento do theme.css para a direção proposta

> Direção proposta. O estado atual está no `DESIGN.md`; tokens no `frontend\src\styles\theme.css`.
> Este arquivo compara cada variável do `theme.css` com o que o `MASTER.md` propõe. Nada aqui foi aplicado.
> Contrastes calculados pela fórmula de luminância relativa do WCAG 2.

**Resumo:** das 87 variáveis do tema (todas listadas abaixo), 4 têm mudança de valor proposta (`--cor-borda-forte`, `--cor-pressionado-neutro`, `--cor-desabilitado-texto` e `--cor-ok-texto`) e 1 é nova (`--cor-marcador`). As demais ficam como estão. Várias delas foram mantidas contra uma recomendação da skill, e a observação diz por quê.

## Cores de base

| Variável do theme.css | Valor atual | Valor proposto | Observação |
|---|---|---|---|
| `--cor-primaria` | `#2f5d8a` | manter | A skill sugeriu ardósia `#1E293B`/`#334155` como primária e verde como CTA; mantido pela Regra da Voz Única. Branco sobre ela: 6,88:1 |
| `--cor-primaria-escura` | `#1f4266` | manter | Hover; branco 10,35:1; sobre a primária clara, 9,08:1 |
| `--cor-primaria-clara` | `#eaf1f8` | manter | Página atual no menu; texto secundário sobre ela, 4,80:1 |
| `--cor-superficie` | `#ffffff` | manter | A skill sugeriu cartão escuro `#1B2336` (tema escuro, C-02) |
| `--cor-fundo` | `#f4f7fa` | manter | Equivale ao "Background `#F8FAFC`" da consulta mais estreita; diferença imperceptível |
| `--cor-texto` | `#1b2a3a` | manter | 13,57:1 sobre o fundo |
| `--cor-texto-suave` | `#5b6b7d` | manter | 4,65 a 5,46:1 nos fundos em uso; passa a ser também a cor do marcador |
| `--cor-borda` | `#dce3eb` | manter | Divisória de painel (decorativa, 1,29:1); não delimita controle sozinha |
| `--cor-texto-inverso` | `#ffffff` | manter | Só sobre primária e crítico, todos acima de 6,5:1 |

## Situação

| Variável do theme.css | Valor atual | Valor proposto | Observação |
|---|---|---|---|
| `--cor-ok` | `#2e7d5b` | manter | Faixa (não-texto): 5,00:1 sobre branco |
| `--cor-ok-texto` | `#2e7d5b` | **`#2a7454`** | Hoje 4,43:1 sobre `--cor-ok-fundo`; proposto 5,00:1 (5,64:1 sobre branco). A faixa continua em `--cor-ok` |
| `--cor-ok-fundo` | `#e8f4ee` | manter | |
| `--cor-atencao` | `#b26b00` | manter | Só faixa: 4,20:1 sobre branco, insuficiente para texto e suficiente para não-texto |
| `--cor-atencao-texto` | `#8a5300` | manter | 5,76:1 sobre o fundo de atenção; uso obrigatório para texto de atenção |
| `--cor-atencao-fundo` | `#fdf3e3` | manter | |
| `--cor-critico` | `#b42318` | manter | Faixa e botão de perigo; branco 6,57:1. A skill sugeriu `#EF4444`/`#DC2626` |
| `--cor-critico-texto` | `#b42318` | manter | 5,74:1 sobre o fundo crítico |
| `--cor-critico-fundo` | `#fcecea` | manter | |

## Estados de controle

| Variável do theme.css | Valor atual | Valor proposto | Observação |
|---|---|---|---|
| `--cor-primaria-pressionada` | `#183552` | manter | Branco 12,58:1 |
| `--cor-primaria-clara-pressionada` | `#dbe7f3` | manter | Primária escura sobre ela: 8,25:1 |
| `--cor-critico-escura` | `#921c13` | manter | Branco 8,76:1 |
| `--cor-critico-pressionada` | `#76170f` | manter | Branco 11,05:1 |
| `--cor-borda-forte` | `#a9b6c4` | **`#7d8b9c`** | Contorno do campo: hoje 2,06:1 sobre branco e 1,92:1 sobre o fundo, abaixo do 3:1 de componente (WCAG 1.4.11). Proposto 3,47 / 3,23:1. O campo fica mais marcado; o hover dele (borda `--cor-texto-suave`) continua mais escuro |
| `--cor-hover-neutro` | `#eef2f6` | manter | Texto secundário sobre ele: 4,86:1 |
| `--cor-pressionado-neutro` | `#e2e8ef` | **`#e5eaf0`** | Texto secundário sobre ele: hoje 4,43:1 (perfil do usuário com o menu aberto); proposto 4,52:1. Continua distinto do hover |
| `--cor-desabilitado-fundo` | `#e9edf2` | manter | |
| `--cor-desabilitado-texto` | `#8593a3` | **`#5d6c7e`** | Hoje 2,67:1 sobre o fundo bloqueado e 3,13:1 sobre branco; proposto 4,57 / 5,37:1. **Diverge do DESIGN.md** (ver Conflitos). O estado bloqueado passa a ser indicado pelo fundo, pela falta de borda e pelo cursor, não pelo texto apagado |
| (nova) `--cor-marcador` | não existe | **`var(--cor-texto-suave)`** | Hoje o marcador dos campos ("Digite o nome ou o código de barras", "dd/mm/aaaa") usa a cor padrão do navegador, que o projeto não controla. Proposto: 5,46:1 sobre branco, com `opacity: 1` |
| `--cor-foco` | `#2f5d8a` | manter | A skill sugeriu anel branco (invisível sobre fundo claro, C-10) |
| `--cor-sobreposicao` | `rgba(27, 42, 58, 0.45)` | manter | A skill sugeriu `rgba(0,0,0,0.5)` com `blur(4px)`; desfoque rejeitado (C-04) |
| `--opacidade-ocupado` | `0.6` | manter | Lista recarregando; ela é temporária e continua anunciada por `aria-busy` |

## Espaçamento

| Variável do theme.css | Valor atual | Valor proposto | Observação |
|---|---|---|---|
| `--esp-0` | `0` | manter | |
| `--esp-1` | `4px` | manter | A densidade 8 da skill pedia também um passo de 2px; rejeitado (Regra da Escala de 4px, C-06) |
| `--esp-2` | `8px` | manter | |
| `--esp-3` | `12px` | manter | |
| `--esp-4` | `16px` | manter | Passa a ser o recuo horizontal de célula nas tabelas densas (`pages/estoque.md`), no lugar de `--esp-5` |
| `--esp-5` | `24px` | manter | |
| `--esp-6` | `32px` | manter | |
| `--esp-7` | `48px` | manter | |

## Tipografia

| Variável do theme.css | Valor atual | Valor proposto | Observação |
|---|---|---|---|
| `--fonte` | `"IBM Plex Sans", system-ui, …` | manter | A skill sugeriu Fira Code + Fira Sans; a própria base dela indica IBM Plex Sans para dados (C-07) |
| `--peso-normal` | `400` | manter | |
| `--peso-medio` | `500` | manter | A skill usa 600 nos botões; rejeitado (Regra dos Dois Pesos) |
| `--fs-1` | `0.8125rem` (13px) | manter | O estilo Data-Dense sugere 12px; rejeitado. 13px continua sendo o menor texto |
| `--fs-2` | `0.875rem` (14px) | manter | |
| `--fs-3` | `1rem` (16px) | manter | Também evita o zoom automático do celular ao focar um campo |
| `--fs-4` | `1.125rem` (18px) | manter | |
| `--fs-5` | `1.5rem` (24px) | manter | |
| `--fs-6` | `2rem` (32px) | manter | |
| `--lh-corpo` | `1.55` | manter | |
| `--lh-titulo` | `1.25` | manter | |
| `--lh-numero` | `1.1` | manter | |
| `--medida-texto` | `68ch` | manter | |

## Raios, bordas, foco e sombra

| Variável do theme.css | Valor atual | Valor proposto | Observação |
|---|---|---|---|
| `--raio-p` | `6px` | manter | A skill sugeriu 8px (C-09) |
| `--raio-m` | `10px` | manter | A skill sugeriu 12px nos cartões e 16px no modal (C-09) |
| `--borda-largura` | `1px` | manter | A skill usa borda de 2px no botão secundário; rejeitado |
| `--borda` | `1px solid var(--cor-borda)` | manter | |
| `--etiqueta-largura` | `4px` | manter | Etiqueta de prateleira |
| `--recuo-etiqueta` | `calc(1px - 4px)` | manter | |
| `--foco-anel` | `2px solid var(--cor-foco)` | manter | |
| `--foco-anel-forte` | `3px solid var(--cor-texto)` | manter | |
| `--foco-distancia` | `2px` | manter | |
| `--sublinhado-distancia` | `3px` | manter | |
| `--sombra-flutuante` | `0 8px 24px rgba(27, 42, 58, 0.14)` | manter | Única sombra; a escala sm/md/lg/xl da skill foi rejeitada (C-04) |

## Movimento

| Variável do theme.css | Valor atual | Valor proposto | Observação |
|---|---|---|---|
| `--mov-rapido` | `120ms` | manter | A skill pede de 150 a 300ms; diferença pequena, registrada em C-13 |
| `--mov-medio` | `200ms` | manter | |
| `--mov-curva` | `cubic-bezier(0.2, 0, 0, 1)` | manter | |
| `--mov-giro` | `800ms` | manter | Para com `prefers-reduced-motion` |

## Dimensões e camadas

| Variável do theme.css | Valor atual | Valor proposto | Observação |
|---|---|---|---|
| `--alvo-min` | `40px` (44px até 900px) | manter | O estilo Data-Dense sugere linha de 36px; rejeitado (C-11) |
| `--largura-menu` | `240px` | manter | Igual ao `--sidebar-width` do estilo Data-Dense |
| `--altura-cabecalho` | `56px` | manter | Igual ao `--header-height` do estilo Data-Dense; também é o `top` do cabeçalho fixo de tabela |
| `--largura-conteudo` | `1120px` | manter | A página gerada sugeria 1400px ou largura total; não adotado sem captura que mostre ganho (ver `pages/estoque.md`) |
| `--largura-login` | `400px` | manter | |
| `--largura-gaveta` | `288px` | manter | |
| `--largura-dialogo` | `440px` | manter | A skill sugeriu 500px |
| `--largura-suspenso` | `240px` | manter | |
| `--largura-nome` | `22ch` | manter | |
| `--largura-formulario` | `560px` | manter | |
| `--largura-busca` | `280px` | manter | |
| `--largura-coluna-numero` | `128px` | manter | |
| `--largura-coluna-situacao` | `160px` | manter | |
| `--largura-coluna-tempo` | `224px` | manter | |
| `--camada-cabecalho` | `10` | manter | Escala 10/20/50, coerente com a sugestão "10 20 30 50" da página gerada |
| `--camada-lista` | `20` | manter | |
| `--altura-lista-opcoes` | `320px` | manter | |
| `--camada-sobreposicao` | `50` | manter | |
| `--tamanho-oculto` | `1px` | manter | |
| `--icone-p` | `18px` | manter | |
| `--icone-m` | `20px` | manter | |

## Fora do theme.css (regras de componente que a proposta exige)

As propostas abaixo não mudam variáveis; mudam regras de CSS dos componentes, que dependem das variáveis acima.

- `::placeholder { color: var(--cor-marcador); opacity: 1; }` nos campos.
- Cabeçalho de tabela fixo ao rolar (`position: sticky; top: var(--altura-cabecalho)`). Antes, conferir que nenhum ancestral tem `overflow: hidden`, porque ele anula o `sticky`.
- Destaque de linha no hover (`--cor-hover-neutro`) só em linhas cujo conteúdo inteiro é um link.
- Recuo horizontal de célula com `--esp-4` nas tabelas de estoque.
- O botão-ícone desabilitado não tem fundo, e com o novo `--cor-desabilitado-texto` o ícone ficaria igual ao habilitado. Ele precisa de outro sinal, por exemplo o fundo `--cor-desabilitado-fundo`.

## Conflitos com o DESIGN.md

1. **Texto desabilitado (`--cor-desabilitado-texto`).** O DESIGN.md registra que "o contraste baixo (2,7:1) é intencional e só vale para o que não aceita ação". A meta de 4,5:1 em todo par texto/fundo pede `#5d6c7e`. O WCAG dispensa controles desabilitados, mas a meta do dono é mais rígida. Se a proposta for aprovada e aplicada, o DESIGN.md (seção Colors) e o `.impeccable/design.json` serão regerados com `/impeccable document`.
2. **Borda do campo (`--cor-borda-forte`).** Não fere regra nomeada, mas muda a frase do DESIGN.md "Campos precisam de um contorno mais firme que os painéis": continua verdadeira, só que mais forte. O frontmatter (`borda-forte`) muda de valor.
3. **Texto ok (`--cor-ok-texto`).** O DESIGN.md diz que o verde "usa o mesmo valor" na faixa e no texto. A proposta separa os dois, como já acontece com o âmbar.
4. **Pressionado neutro (`--cor-pressionado-neutro`).** É só uma mudança de valor no frontmatter, sem regra afetada.
5. **Recomendações da skill que contrariavam regras nomeadas** (Regra da Etiqueta, da Voz Única, do Que Flutua, do Canto Reto, dos Dois Pesos, da Escala de 4px) **não foram adotadas**. A lista completa está em `MASTER.md`, seção "Conflitos registrados" (C-01 a C-16).

## Conferência com os princípios do PRODUCT.md

| Princípio ou exigência | Situação na proposta |
|---|---|
| Situação nunca indicada só por cor | **Atende.** A faixa sempre vem com o nome da situação em texto (Regra da Cor que Não Fala Sozinha). O semáforo da skill foi aceito só nessas condições. Nenhuma variável proposta muda isso |
| Layout a partir de 320px, sem rolagem horizontal | **Atende.** O checklist da skill (375 a 1440px) foi trocado pelas 9 larguras do projeto, a partir de 320px, mais o zoom de 200%. A rolagem horizontal de tabela foi rejeitada (C-12) |
| Foco visível em todos os controles | **Atende.** O anel branco da skill foi rejeitado (C-10) |
| Contraste adequado para texto e estados | **Melhora.** Os 3 pares de texto abaixo de 4,5:1 sobem para 4,52 a 5,00:1 ou mais, e a borda de campo passa de 3:1 |
| Operação primeiro (celular, uma mão, poucos toques) | **Atende.** Os alvos de 40/44px foram mantidos contra a linha de 36px da skill (C-11) |
| A tela não mente | **Atende.** Sem rótulo "ao vivo"; mantido "Situação do estoque às HH:MM" com o botão Atualizar |
| Nada se apaga | **Atende.** Seleção múltipla e edição em lote não foram adotadas (C-14) |
