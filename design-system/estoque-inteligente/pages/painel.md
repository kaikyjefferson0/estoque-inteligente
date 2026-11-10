# Painel: regras próprias

> **PROJETO:** Estoque Inteligente · **Tela:** Painel (`DashboardPage.tsx`) · **Tipo:** painel / visão de dados
> Direção proposta. O estado atual está no `DESIGN.md`; tokens no `theme.css`.
> As regras daqui substituem as do `MASTER.md` só nesta tela. O que não estiver aqui segue o Master.

---

## Layout

- **Largura:** a mesma do Master (até 1120px). A sugestão gerada de 1400px ou largura total não foi adotada: o painel tem só quatro indicadores e uma lista, e linhas mais largas pioram a leitura.
- **Grade:** sem grade de 12 colunas. A ordem é fixa: cabeçalho da página, painel de situações, totais discretos e "Últimas movimentações".
- **Situações:** 4 colunas no computador e 2 até 900px. Até 320px continuam 2 colunas, conferindo nas capturas que "Estoque baixo" e "Sem estoque" não quebram no meio da palavra.

## Densidade

- **Alta, sem apertar o toque:** linhas de movimentação com recuo de 12px (`--esp-3`) na vertical, como hoje. Nada abaixo do alvo de toque.

## Componentes próprios

- **Painel de situações:** um painel só, dividido pelas etiquetas, com o lado esquerdo reto. Com o número em zero, a etiqueta fica verde e a célula branca; acima de zero, a célula ganha o fundo e a cor de texto da situação. O número usa `--fs-6` e algarismos tabulares.
- **Totais discretos:** "Produtos cadastrados" e "Alertas ativos" em linha, texto secundário, sem caixa nem etiqueta.
- **Últimas movimentações:** nome em linha própria com a quantidade com sinal à direita; tipo, lote/validade, autor e data em etiquetas de metadado.

## Recomendações da skill para esta tela

| Recomendação gerada | Decisão |
|---|---|
| Dicas ao passar o mouse, zoom em gráfico | Não se aplica: o painel não tem gráficos. Se um dia tiver, seguir a skill `dataviz` com as cores de situação só nas marcas de situação |
| Destaque de linha no hover | Só se a linha virar link para o produto; hoje não é |
| Animação suave de filtro | Não há filtro nesta tela |
| Indicador de carregando | Já existe; manter a tolerância da partida a frio (até um minuto) |
| Rolagem horizontal ou cartões | Não se aplica: a lista já empilha nome e etiquetas em qualquer largura |
| Seleção múltipla e edição em lote | Rejeitado: movimentações são imutáveis (C-14) |
