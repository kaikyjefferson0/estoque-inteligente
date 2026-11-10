# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Público que decide (objetivo do projeto):** recrutadores e avaliadores técnicos que abrem a demonstração pública e o README para julgar a competência de quem construiu o sistema. A primeira impressão acontece na tela de login, no painel e nas capturas do README.
- **Usuário simulado (o cenário que o produto representa):** pequeno comércio com produtos perecíveis (mercadinho, farmácia, padaria).
  - **Operador:** registra entradas e saídas no balcão ou no depósito, muitas vezes pelo celular, lendo o código de barras pela câmera. Cadastra e edita produtos e fornecedores, vê estoque, alertas e painel.
  - **Admin:** o dono ou gerente, mais no computador. Além do que o operador faz, gerencia usuários e faz ajustes de estoque (contagem, baixa de lote vencido).

## Product Purpose

Controle de estoque com lotes e validade: saber o que tem, o que está acabando e o que vai vencer, sem que o saldo minta. Existe como projeto de portfólio: o sucesso é um avaliador entrar na demo, entender o sistema em poucos minutos e sair convencido de que as regras de negócio, a segurança e a qualidade são de nível profissional. O cenário de pequeno comércio precisa ser crível para isso funcionar.

## Positioning

Um controle de estoque em que as regras valem de verdade, não só na tela: saída por FEFO (sai primeiro o lote que vence antes), saldo que nunca fica negativo, histórico imutável garantido pelo próprio banco (triggers e constraints), alertas sem repetição e um painel calculado na hora pelas mesmas funções dos alertas, para os números nunca discordarem. A credibilidade vem dessa coerência demonstrável, documentada e testada (cada caso de teste CT-xx vira um teste).

## Operating Context

- **Demo pública** no Render, com conta de operador aberta no README e botão "Entrar como demonstração". Dados de exemplo recriados uma vez por dia; a conta demo tem limites de alterações (RN-56) e de cadastros (RN-57) e não troca a senha (RN-53).
- **Partida a frio:** no plano gratuito a API dorme; o primeiro acesso pode levar até um minuto, e as telas mostram carregando com tolerância enquanto ela acorda.
- **Fluxos centrais:** entrada (com leitura de código de barras), saída FEFO, ajuste por contagem (só admin), detalhe do produto com lotes e histórico, alertas (estoque baixo, vencimento próximo, vencido), painel, cadastros de produtos e fornecedores, usuários (só admin), minha conta.
- **Datas** seguem sempre o fuso America/Sao_Paulo; um lote que vence hoje ainda pode sair.
- **Ambiente local** completo por Docker Compose, com as mesmas contas de demonstração.

## Capabilities and Constraints

- Regras de negócio completas em `docs\regras-negocio.md` (RN-xx) e casos de teste em `docs\casos-de-teste.md`; a interface nunca contradiz essas regras nem promete o que elas não garantem.
- Dois perfis, admin e operador; o operador não vê a área de usuários nem os ajustes. Não há auto-cadastro. Erro de login sempre genérico.
- Produtos e fornecedores nunca são apagados; movimentações nunca são editadas nem apagadas. A interface não oferece exclusão nem edição desses registros.
- Listas paginadas (padrão 50, máximo 200) com busca em produtos, estoque e fornecedores.
- **Stack do frontend:** React, TypeScript e Vite. **Decisão confirmada (11/2026): migrar a estilização para Tailwind** (branch `feat/tailwind-ui`). Os tokens do tema continuam com uma fonte única; o `CLAUDE.md` ainda cita `theme.css` como essa fonte e precisa ser atualizado quando a migração definir onde ela passa a morar.
- Estados obrigatórios em toda página que busca dados: carregando, erro (diz o que fazer) e vazio (convida a uma ação). Formulários seguem o padrão da skill `frontend-page` (erro some ao editar, foco no primeiro campo inválido, anúncio na região viva).
- Idioma da interface: português do Brasil.

## Brand Commitments

- Nome: **Estoque Inteligente**.
- Voz: português do Brasil claro e direto, sem jargão técnico para o usuário final; mensagens dizem o que aconteceu e o que fazer ("Informe a quantidade, maior que zero.").

## Evidence on Hand

- Demo pública: https://estoque-site-4qap.onrender.com (conta de operador publicada no README).
- Capturas oficiais em `docs\imagens` (painel, estoque, detalhe do produto, entrada, alertas, usuários e duas no celular a 390px), geradas por `npm run capturas:readme`.
- Números de qualidade reais: 295 testes (235 pytest, 50 Vitest, 10 Playwright), CI no GitHub Actions.
- **Não existem:** clientes reais, depoimentos, métricas de uso, logotipo próprio nem preços. Nada disso pode ser inventado; dados de exemplo da demo são fictícios e assim devem parecer.

## Product Principles

1. **A tela não mente.** Saldo, alertas e painel mostram exatamente o que o banco garante; nenhum número decorativo, nenhum estado otimista que a regra não confirma.
2. **Operação primeiro.** Entrada e saída no celular, com uma mão, no meio do expediente: poucos toques, leitura de código de barras, confirmação clara do saldo resultante.
3. **Rigor visível em poucos minutos.** O avaliador precisa perceber FEFO, lotes, validade e histórico imutável navegando a demo, sem ler o código.
4. **Erros que ensinam.** Toda recusa de regra (saldo insuficiente, lote vencido, limite da demo) explica o motivo e o próximo passo.
5. **Nada se apaga.** A interface reflete que histórico, produtos e fornecedores são permanentes; correções acontecem por ajuste registrado, não por edição.

## Accessibility & Inclusion

- Telas revisadas nas larguras 320, 360, 375, 390, 414, 768, 1024, 1280 e 1440px e com zoom de 200%, sem rolagem horizontal da página.
- Foco visível em todos os controles; erros de formulário ligados ao campo (`aria-invalid`, `aria-describedby`) e anunciados por região viva.
- Contraste adequado para texto e estados (crítico, alerta, sucesso), sem depender só de cor para comunicar situação.
