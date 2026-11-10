# Alertas: regras próprias

> **PROJETO:** Estoque Inteligente · **Tela:** Alertas (`AlertasPage.tsx`) · **Tipo:** lista de situações
> Direção proposta. O estado atual está no `DESIGN.md`; tokens no `theme.css`.
> As regras daqui substituem as do `MASTER.md` só nesta tela. O que não estiver aqui segue o Master.

---

## Layout

- **Filtros acima da lista:** segmentos por tipo (Todos, Vencido, Vencimento próximo, Estoque baixo), a opção de incluir os resolvidos e a contagem alinhada à direita, quebrando para baixo no celular.
- **Lista num painel com o lado esquerdo reto**, porque cada item leva etiqueta de prateleira (Regra do Canto Reto).

## Cor (esta é a tela onde a cor de situação mais aparece)

- **Item ativo:** faixa e fundo claro da situação; o tipo do alerta ("Estoque baixo", "Vencimento próximo", "Vencido") em `--etiqueta-texto`. Âmbar sempre em `--cor-atencao-texto` (5,76:1), nunca em `--cor-atencao`.
- **Item resolvido:** sem fundo e com a faixa neutra (RN-39). A etiqueta "Resolvido em" com a data diz o estado em texto, nunca só pela ausência de cor.
- **Nome do produto:** link sublinhado em `--cor-primaria` (6,00 a 6,26:1 sobre os fundos de situação).
- **Foco dentro de item âmbar ou vermelho:** anel forte de 3px em azul-noite, para dentro do item.

## Densidade

- Média: recuo de `--esp-3` (12px) por `--esp-5` (24px), com o item inteiro clicável e pelo menos o alvo de toque.

## Recomendações da skill para esta tela

| Recomendação gerada | Decisão |
|---|---|
| Destaque de linha no hover | Aqui o item inteiro é link: o hover escurece o nome do produto (`--cor-primaria-escura`), sem mudar o fundo da situação, para não confundir com outra situação |
| Seleção múltipla e ação em lote | Rejeitado: alertas se resolvem pela regra de estoque, não por clique (C-14) |
| Atualização em tempo real | Só com a hora da última atualização visível; nada de "ao vivo" sem atualização automática |
