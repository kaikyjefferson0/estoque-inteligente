# Entrada e Saída: regras próprias

> **PROJETO:** Estoque Inteligente · **Telas:** Entrada (`EntradaPage.tsx`) e Saída (`SaidaPage.tsx`), estilo em `MovimentoPage.css` · **Tipo:** formulário operacional
> Direção proposta. O estado atual está no `DESIGN.md`; tokens no `theme.css`.
> As regras daqui substituem as do `MASTER.md` só nestas telas. O que não estiver aqui segue o Master.

---

## Contexto que manda nesta tela

Operador no balcão ou no depósito, **no celular, com uma mão**, lendo o código de barras pela câmera. Esta tela **não segue a densidade 8** do Master: aqui vale o oposto, com menos coisa na tela e alvos maiores.

## Layout

- **Uma coluna** em qualquer largura; formulário de até 560px.
- **Ordem:** leitura do código (campo grande) → produto lido (nome e saldo disponível) → quantidade (e validade na entrada) → botão primário com verbo ("Registrar entrada", "Registrar saída") → aviso de sucesso com o saldo atualizado.

## Densidade

- **Baixa:** recuo de `--esp-5` no painel (`--esp-4` até 640px) e espaço de `--esp-4` entre campos.
- **Campo de leitura** em `--fs-4` (18px): é o ponto de partida de toda movimentação.
- **Botão primário** com largura total no celular.

## Componentes próprios

- **Leitura do código:** campo com o botão de buscar colado à direita; até 400px, o botão mostra só a lupa, com o texto oculto para leitor de tela.
- **Saída FEFO:** a dica da quantidade diz o limite e a regra ("Até 40. Sai primeiro do lote que vence antes."), e o aviso de sucesso informa de quantos lotes a saída saiu. Uma lista prévia dos lotes, na ordem em que vão sair, tornaria o FEFO visível ao avaliador (princípio "Rigor visível"). Fica como proposta a avaliar, porque precisa de dados que a tela hoje não mostra.
- **Recusa de regra** (saldo insuficiente, lote vencido, limite da demonstração): aviso crítico no topo do formulário, dizendo o motivo e o próximo passo.

## Recomendações da skill para estas telas

| Recomendação gerada | Decisão |
|---|---|
| Densidade alta | Rejeitado nesta tela: o princípio "Operação primeiro" do PRODUCT.md manda |
| Seleção múltipla e edição em lote | Rejeitado (C-14): uma movimentação por vez, registrada para sempre |
| Rótulos visíveis, erro junto do campo | Já é o padrão (`<Campo>`, `useErrosDoFormulario`) |
| `inputmode` adequado | A avaliar: hoje nenhum campo destas telas define `inputmode`; `numeric` na quantidade abriria o teclado numérico no celular |
