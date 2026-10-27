---
name: frontend-page
description: Use quando for criar ou alterar uma página ou componente do frontend React (pasta frontend), para seguir o padrão visual e de código do projeto.
---

# Padrão das páginas do frontend

Antes de começar, leia `frontend\src\styles\theme.css` e uma página pronta como referência (`frontend\src\pages\DashboardPage.tsx`). Não leia nem mostre `frontend\.env`.

## Dados e API

- Toda chamada passa por `api()` de `src\api\client.ts`. Ele envia o token, transforma erros em mensagens legíveis (com o `detail` da API) e, em 401, apaga o token e leva ao login. Nunca use `fetch` direto numa página.
- Para leituras (GET) use `useRecurso<T>(caminho)` de `src\api\useRecurso.ts`, que devolve `dados`, `erro`, `carregando`, `atualizadoEm` e `recarregar`.
- Os tipos das respostas ficam em `src\types\<assunto>.ts` e espelham os schemas Pydantic do backend (mesmos nomes de campo).
- Datas `YYYY-MM-DD` são formatadas com `formatarData` (sem fuso); números com `formatarNumero` e `formatarComSinal` de `src\utils\formato.ts`.

## Estados obrigatórios

Toda página que busca dados mostra os três estados, com os componentes de `src\components\Estados.tsx`:

- **Carregando:** `<Carregando texto="Carregando …" />`. Ao recarregar, mantenha os dados na tela e ponha o botão em `carregando`.
- **Erro:** `<ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />`. A mensagem diz o que fazer.
- **Vazio:** `<Vazio icone titulo acao>`. Ele diz o que falta e **convida a uma ação** (ex.: "Cadastrar produto").

## Formulários

- Use `<Campo rotulo erro dica>` de `src\components\Campo.tsx` (rótulo ligado ao campo, `aria-invalid` e `aria-describedby` já tratados).
- Valide no cliente antes de enviar, com mensagens que dizem o que fazer ("Informe a quantidade, maior que zero.").
- Mostre os erros da API: `ApiError.message` num `<Aviso situacao="critico">` no topo do formulário e `ApiError.campos[nome]` no campo correspondente (422).
- O botão de envio usa `<Botao type="submit" variante="primaria" carregando textoCarregando="Registrando…">`, com verbo ("Registrar saída").
- A regra de negócio é do backend; o frontend só ajuda o usuário a acertar.

## Visual

- **Só variáveis do `theme.css`** para cor, fonte, tamanho, raio, sombra, duração e dimensões. Nada literal nos `.css` das páginas, e nada de `style={{}}`.
- **Escala de espaçamento:** margin, padding e gap só com `var(--esp-1)` a `var(--esp-7)` (4 a 48px).
- CSS puro: o CSS da página fica ao lado dela (`NomePage.css`), com classes em português no formato `bloco__parte--variante`. Sem Tailwind.
- **Um único botão primário por tela.** Os demais são `secundaria` ou `fantasma`.
- Quantidades e saldos com a classe `numero` (`tabular-nums`).
- Alvos de toque: os controles usam `min-height: var(--alvo-min)` (44px no celular).
- Movimento só em resposta a ações, com `--mov-rapido` ou `--mov-medio`; o tema já desliga com `prefers-reduced-motion`.
- Ícones só de `@tabler/icons-react`, com `aria-hidden` quando há texto ao lado; o tamanho vem do CSS (`--icone-p` ou `--icone-m`).
- Sem gradientes, vidro, grade de cartões idênticos com sombra, CAIXA ALTA, setas "→" em botões ou emojis. Textos curtos, em português, com verbo nos botões.

## Etiqueta de prateleira

Itens de estoque, lotes e alertas levam a etiqueta: classe `etiqueta etiqueta--ok | etiqueta--atencao | etiqueta--critico` (tipo `Situacao` de `src\types\situacao.ts`). Ela é a faixa de 4px à esquerda, na cor da situação, com o canto esquerdo reto: o contêiner não pode arredondar o lado esquerdo. Para itens com problema, use o fundo claro `var(--etiqueta-fundo)` e o texto `var(--etiqueta-texto)`. O resto da tela fica calmo.

## Menus e janelas

- Menu suspenso: `@radix-ui/react-dropdown-menu`, com as classes `suspenso` e `suspenso__item`.
- Confirmação de ação irreversível (ajuste, desativar usuário): `<ConfirmarDialogo>` de `src\components\ConfirmarDialogo.tsx` (Radix AlertDialog).
- Gaveta ou painel lateral: `@radix-ui/react-dialog`.

## Perfis

- Itens e botões só de admin ficam escondidos para o operador (`usuario.perfil === 'admin'`, via `useAuth()`), e as rotas de admin ficam dentro de `<RotaAdmin>` em `App.tsx`.
- Esconder é só conveniência: a segurança real é do backend (`require_admin`). Nunca confie no frontend para permissão.
- Itens novos do menu entram em `src\layout\itensMenu.ts` (com `soAdmin: true` quando for o caso).

## Ao terminar

1. `npm run build` (sem erros de TypeScript) e `npm run lint`, dentro de `frontend`.
2. Suba a API e o site e chame o subagente **ui-reviewer** na página nova. Corrija os itens Críticos e mostre ao usuário os Importantes.
