# Estoque (e listas de cadastro): regras próprias

> **PROJETO:** Estoque Inteligente · **Telas:** Estoque (`EstoquePage.tsx`); vale também para Produtos, Fornecedores e Usuários · **Tipo:** tabela de dados
> Direção proposta. O estado atual está no `DESIGN.md`; tokens no `theme.css`.
> As regras daqui substituem as do `MASTER.md` só nestas telas. O que não estiver aqui segue o Master.

---

## Layout

- **Largura:** até 1120px, como no Master. Avaliar 1280px só nesta tela, e só se as capturas de 1440px mostrarem colunas espremidas; seria uma variável nova (`--largura-conteudo-tabela`), e não uma mudança de `--largura-conteudo`.
- **Busca e paginação:** busca acima da tabela; paginação abaixo, com "x a y de z" e os botões Anterior e Próxima (RN-51: 50 por página, até 200).

## Densidade (a mudança principal desta direção)

- **Recuo horizontal das células:** `--esp-4` (16px) no lugar de `--esp-5` (24px), para caber mais colunas antes de a tabela empilhar. A primeira e a última coluna mantêm `--esp-5`, alinhadas ao cabeçalho do painel.
- **Recuo vertical:** `--esp-2` (8px), como hoje. A altura da linha nunca fica abaixo do alvo de toque (40/44px), porque links e ações da linha precisam dele (C-11).
- **Cabeçalho da tabela fixo** ao rolar (`top: var(--altura-cabecalho)`), com fundo de superfície e a borda inferior. Antes de aplicar, tirar `overflow: hidden` dos ancestrais ou o `sticky` não funciona.

## Componentes próprios

- **Linha com situação:** a etiqueta de prateleira fica na linha inteira (no Estoque), com o fundo claro quando há problema e a situação também escrita numa coluna própria. O painel da tabela não arredonda o lado da etiqueta (Regra do Canto Reto).
- **Saldo:** alinhado à direita, algarismos tabulares, unidade junto do número sem quebra.
- **Hover de linha:** hoje só o nome é link para o detalhe do produto. Fundo `--cor-hover-neutro` na linha só se ela inteira passar a ser clicável; senão, nenhum. Em linha com problema, o hover não pode trocar o fundo da situação.
- **Celular:** abaixo de 48rem de largura do painel (container query), a tabela vira lista empilhada: nome em cima, etiquetas embaixo, ação no fim.

## Recomendações da skill para estas telas

| Recomendação gerada | Decisão |
|---|---|
| Tabelas ordenáveis | A avaliar: depende de a API aceitar ordenação; a regra é do backend |
| Exportar dados | Fora do escopo atual; não prometer na interface o que não existe |
| Rolagem horizontal da tabela | Rejeitado (C-12): lista empilhada |
| Seleção múltipla e edição em lote | Rejeitado (C-14) |
| Fonte de 12px e linha de 36px | Rejeitado (C-07, C-11) |
| Barra lateral de filtros | Não: os filtros ficam acima da tabela, como hoje, para não disputar espaço com o menu |
