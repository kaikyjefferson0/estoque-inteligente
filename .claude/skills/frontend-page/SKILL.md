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

Referência pronta: `src\pages\LoginPage.tsx`. Todo formulário segue estas três regras, já implementadas por `useErrosDoFormulario` (`src\components\useErrosDoFormulario.ts`) e `<AnuncioDeErros>`:

1. **O erro some ao editar.** No `onChange` de cada campo, chame `limpar('nome')`; o erro daquele campo some assim que a pessoa edita, e os dos outros ficam.
2. **Foco e anúncio na validação.** No envio, `if (!mostrar(form, validar(...))) return`. O `mostrar` põe o foco no primeiro campo inválido (na ordem da tela, passada ao hook) e escreve um resumo na região viva. Para isso:
   - cada campo tem `name` igual à chave do erro;
   - o `<Campo erro={erros.nome}>` já põe `aria-invalid` e liga a mensagem por `aria-describedby`, então o leitor de tela lê o erro ao receber o foco;
   - o formulário tem `<AnuncioDeErros mensagem={anuncio} />` (`aria-live="polite"`) logo no início, e `noValidate` para usar as nossas mensagens.
3. **A cor crítica fica em todos os estados.** O campo com erro mantém a borda e o anel de foco em `--cor-critico` também no hover e no foco (`.campo--erro` em `componentes.css`). Não sobrescreva isso no CSS da página.

```tsx
const CAMPOS = ['quantidade', 'validade'] as const // ordem na tela
const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)

async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
  evento.preventDefault()
  const form = evento.currentTarget
  if (!mostrar(form, validar(valores))) return
  try {
    await api('/stock/entries', { body: valores })
  } catch (erro) {
    if (erro instanceof ApiError) {
      mostrar(form, erro.campos) // 422: erros de campo da API pelo mesmo caminho
      setErroGeral(erro.message)
    }
  }
}
// <form onSubmit={aoEnviar} noValidate>
//   <AnuncioDeErros mensagem={anuncio} />
//   <Campo name="quantidade" rotulo="Quantidade" erro={erros.quantidade}
//          onChange={(e) => { setQuantidade(e.target.value); limpar('quantidade') }} />
```

- Valide no cliente antes de enviar, com mensagens que dizem o que fazer ("Informe a quantidade, maior que zero.").
- Mostre os erros da API: `ApiError.message` num `<Aviso situacao="critico">` no topo do formulário e `ApiError.campos[nome]` no campo correspondente (422). Se o nome do campo da API for diferente do da tela, converta antes de chamar `mostrar`.
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

## Textos longos e larguras

- **Nenhuma tela tem rolagem horizontal**, em nenhuma largura.
- **Nomes, e-mails e outros textos livres** (pense em 40 caracteres, inclusive uma palavra só, sem espaço) não podem estourar a tela nem empurrar botões:
  - Em listas, tabelas, cabeçalho e menus: uma linha com reticências, usando a classe `texto-cortado` (`componentes.css`) com `title={texto}` igual ao texto, para mostrar tudo ao passar o mouse. O pai precisa deixar o item encolher (`min-width: 0` em flex ou grid; em tabela, a célula com `width: 100%` e `max-width: 0`).
  - Na tela de detalhe (edição, "Minha conta", janelas de confirmação): o texto aparece **inteiro**, quebrando a linha com `texto-inteiro` (`overflow-wrap: anywhere`). É ali que quem está no celular, sem mouse, lê o texto completo.
  - Ícones, setas e marcas ao lado de um texto que encolhe levam `flex-shrink: 0`.
- **Listas no celular:** tabela com mais de duas ou três colunas vira lista empilhada (um item por bloco, ações embaixo), em vez de tabela espremida. Prefira container query no painel (`container-type: inline-size`), para a forma depender da largura real da lista, com ou sem o menu lateral. Exemplo pronto: `src\pages\UsuariosPage.tsx` e `UsuariosPage.css`.
- **Larguras de revisão:** 320, 375, 414, 768 e 1280px. Confira cada tela nas cinco (o `scripts\capturas-ui.mjs` tem `LARGURAS_REVISAO` e mede rolagem horizontal e elementos além da tela).

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
2. Suba a API e o site e chame o subagente **ui-reviewer** na página nova, pedindo as cinco larguras de revisão (320, 375, 414, 768 e 1280px) e dados com textos longos. Corrija os itens Críticos e mostre ao usuário os Importantes.
