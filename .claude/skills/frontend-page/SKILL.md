---
name: frontend-page
description: Use quando for criar ou alterar uma página ou componente do frontend React (pasta frontend), para seguir o padrão visual e de código do projeto.
---

# Padrão das páginas do frontend

Antes de começar, leia `frontend\src\styles\theme.css`, `frontend\src\styles\tailwind.css` e uma página pronta como referência (`frontend\src\pages\DashboardPage.tsx`). Não leia nem mostre `frontend\.env`.

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

- **Só tokens do `theme.css`** para cor, fonte, tamanho, raio, sombra, duração e dimensões. Nada literal nos `.css` das páginas, nada de `style={{}}`.
- **Fluxo dos tokens (Tailwind CSS v4):** valor no `theme.css` (única fonte) → `@theme inline` no `tailwind.css`, só com `var(--...)` → classe. A classe repete o nome do token: `--cor-primaria` → `bg-primaria`/`text-primaria`/`border-primaria`, `--esp-4` → `p-esp-4`/`gap-esp-4`, `--raio-p` → `rounded-p`, `--sombra-flutuante` → `shadow-flutuante`, `--fs-2` → `text-fs-2`, `--peso-medio` → `font-medio`, `--lh-corpo` → `leading-corpo`. Os padrões do Tailwind estão desligados: `p-4`, `bg-blue-500`, `rounded-lg`, `shadow-md`, `text-sm` e `font-semibold` não existem. Token novo entra primeiro no `theme.css` e depois no `@theme`, sem repetir valor.
- **Escala de espaçamento:** margin, padding e gap só de `esp-0` a `esp-7` (0 a 48px): `p-esp-5` nas classes, `var(--esp-5)` no CSS.
- **Sem valores arbitrários:** `p-[13px]`, `w-[3px]`, `p-(--esp-4)` e `p-px` são erro no `npm run lint` (`eslint-plugin-better-tailwindcss`, configurado em `frontend\oxlint.config.ts`). Uma classe que o Tailwind não gera e que nenhum `.css` do `src` define também é erro.
- **`min-w-0` não existe** (a escala padrão está desligada): use `min-w-esp-0`. O mesmo vale para qualquer utilitário numérico do Tailwind (`w-0`, `gap-0`…): use o passo `esp-0`.
- **Cortes do layout:** use as variantes com o mesmo valor do CSS antigo, declaradas no `tailwind.css` com `@custom-variant` (`ate-640:` = `@media (max-width: 640px)`, ou seja, largura ≤ 640). **Nunca** `max-sm:`, `max-md:`…: eles geram `width < corte` e erram exatamente na largura do corte (640px é o teste de zoom de 200%). Um corte que ainda não existe (`ate-400`, `ate-480`, `ate-900`) entra no `tailwind.css` quando a primeira tela precisar dele, com o mesmo valor das `@media` do CSS antigo.
- **Reset do `global.css` em `@layer base`:** o reset (margem de `h1` a `h3`, `p`, `ul`, `ol`, `dl` e `dd`; recuo e marcador de `ul` e `ol`; peso e entrelinha de `h1` a `h3`; tamanho de `h1` e `h2`; fonte e cor herdadas nos controles; cor dos links; anel de foco) fica na camada `base`, o lugar do Preflight. A ordem das camadas é a do Tailwind v4, declarada no `tailwind.css`: `theme, base, components, utilities`. Por isso **os utilitários vencem o reset**: num elemento migrado, a classe vale mesmo numa propriedade que o reset já define. Onde o reset já dá o valor certo, não escreva nada.
- **Espaço entre irmãos vem do `gap` do pai** (`flex flex-col gap-esp-1`), sem margem nem recuo no filho: o respiro entre um título e o `<p>` de apoio é o `gap` do bloco que os contém. Use `mt-*` só quando o pai não for flex nem grid. O `pt-esp-1` dos `<p>` da MinhaConta veio de quando o reset vencia os utilitários e sai quando existir o `<CabecalhoPagina>` (Etapa 4); não copie esse padrão.
- **Grade com colunas compostas** (ex.: rótulo fixo + valor) é token: valor no `theme.css` (`--colunas-rotulo-valor: var(--largura-coluna-numero) minmax(0, 1fr)`) e o `@theme` só aponta (`--grid-template-columns-rotulo-valor: var(--colunas-rotulo-valor)` → `grid-cols-rotulo-valor`).
- **Borda de um lado só:** `border-t border-t-borda` (não `border-borda`, que pinta os quatro lados).
- **Transição para o Tailwind:** as telas ainda não migradas usam o CSS ao lado delas (`NomePage.css`), com classes em português no formato `bloco__parte--variante`. Sem Preflight: o reset é o do `global.css`, na camada `base`. As classes do Tailwind ficam em camadas (`@layer utilities`) e o CSS do projeto (`componentes.css`, `layout.css` e o CSS das telas) não tem camada, então a ordem é **reset < utilitários < CSS do projeto**, qualquer que seja a especificidade: o CSS do projeto sempre vence. Num mesmo elemento, não misture uma classe do projeto com um utilitário para a mesma propriedade. Como o reset está em camada, um seletor dele com pseudoclasse (`a:hover`, `:focus-visible`) não vence mais uma classe sem camada pela especificidade: o hover e o foco de um componente ficam no CSS dele (ex.: `a.suspenso__item:hover` em `componentes.css`). Ao migrar um elemento, troque o estilo inteiro dele e apague o CSS que ficou sem uso.
- **Um único botão primário por tela.** Os demais são `secundaria` ou `fantasma`.
- Quantidades e saldos com a classe `numero` (`tabular-nums`).
- Alvos de toque: os controles usam `min-height: var(--alvo-min)` (44px no celular).
- Movimento só em resposta a ações, com `--mov-rapido` ou `--mov-medio`; o tema já desliga com `prefers-reduced-motion`.
- Ícones só de `@tabler/icons-react`, com `aria-hidden` quando há texto ao lado; o tamanho vem do CSS (`--icone-p` ou `--icone-m`).
- Sem gradientes, vidro, grade de cartões idênticos com sombra, CAIXA ALTA, setas "→" em botões ou emojis. Textos curtos, em português, com verbo nos botões.

## Textos longos e larguras (critérios de aceitação de toda tela)

Valem para todas as telas, novas e alteradas. O `e2e\responsividade.spec.ts` (dentro de `npm run test:e2e`) mede automaticamente os itens marcados com (teste); o resto é conferido nas capturas pelo ui-reviewer.

- **Larguras de revisão:** 320, 360, 375, 390, 414, 768, 1024, 1280 e 1440px, e o zoom de 200% do navegador em 1280px (640px com o dobro de densidade). Tela nova entra na lista `TELAS` do `responsividade.spec.ts`.
- **Nenhuma rolagem horizontal da página** e nada além da borda da tela, em nenhuma largura (teste).
- **Nomes nunca quebram no meio de uma palavra:** quebram só entre palavras. Nada de `overflow-wrap: anywhere` nem `word-break: break-all`. A exceção é um texto que sozinho não cabe na linha (um e-mail longo), e por isso o detalhe usa `min-w-esp-0 wrap-break-word` (`overflow-wrap: break-word`), como em `src\pages\MinhaContaPage.tsx`. A classe antiga `texto-inteiro` só continua nas telas ainda não migradas.
- **Em listas, o nome fica numa linha própria**, com `<NomeEmLista nome={...} />` (`src\components\Metadados.tsx`): no máximo 2 linhas, com reticências, e o nome completo no `title` e na tela de detalhe. Uma quantidade pode ficar à direita do nome; nenhum outro texto vai na linha dele.
- **Metadados (tipo, validade, tempo, código, saldo, perfil) ficam abaixo do nome, como etiquetas**, com `<Metadados itens={[{ rotulo, valor }]} />`. Elas passam para a linha de baixo quando não cabem, sem se sobrepor nem encostar.
- **Texto separado também ao copiar e no leitor de tela (teste):**
  - Rótulo oculto e valor ficam em blocos próprios: `<dl>` com `<dt className="visualmente-oculto">` e `<dd>` (é o que o `Metadados` faz).
  - **Nunca** `<span className="visualmente-oculto">Tipo: </span>Valor` na mesma linha: o espaço do fim some na cópia e vira "Tipo:Valor".
  - Para dar contexto a um número num link (contagem), use `aria-label` no link com o texto visível no começo ("Alertas, 11 ativos").
  - Setas decorativas com texto oculto ("→" + " para ") também grudam: escreva o texto visível ("de 28 para 26").
- **Botões, campos e links soltos com pelo menos 44px de altura no celular** (`min-height: var(--alvo-min)`) (teste). Ações que não cabem vão para a linha de baixo (`flex-wrap`) ou para um menu, sem sair da tela.
- **Tabelas viram listas empilhadas no celular:** um item por bloco, nome em cima, etiquetas embaixo e ações no fim. Prefira container query no painel (`container-type: inline-size`), para a forma depender da largura real da lista, com ou sem o menu lateral. Exemplo: `src\pages\UsuariosPage.tsx`.
- **Formulários em uma coluna no celular**, com o rótulo acima do campo (`<Campo>` já faz assim).
- **Janelas de confirmação cabem inteiras na tela do celular**, com rolagem interna se precisar (`.dialogo`) (teste).
- **Números alinhados** com a classe `numero` (`tabular-nums`). **Número e unidade não se separam:** nomes com quantidade passam por `semQuebraNaUnidade` (`src\utils\formato.ts`; o `NomeEmLista` já usa), que junta "500 g" com espaço inseparável.
- **Espaçamentos só da escala do `theme.css`** (`--esp-0` a `--esp-7`; nas classes, `*-esp-0` a `*-esp-7`).
- Fora das listas (cabeçalho, menu, célula de tabela larga), um texto livre pode usar uma linha só com `texto-cortado` e `title={texto}`. O pai precisa deixar o item encolher (`min-width: 0` em flex ou grid, `min-w-esp-0` nas classes; em tabela, a célula com `width: 100%` e `max-width: 0`). Ícones e marcas ao lado de um texto que encolhe levam `flex-shrink: 0`.

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

1. `npm run build` (sem erros de TypeScript) e `npm run lint` (inclui a checagem de classes do Tailwind), dentro de `frontend`.
2. Rode `npm run test:e2e` (inclui o `responsividade.spec.ts`). Para as capturas, `node e2e\rodar.mjs --responsividade --capturas=<pasta>` (dados da demo, com textos de 60 caracteres e saldo de 99.999).
3. Chame o subagente **ui-reviewer** com essas capturas, em todas as larguras de revisão. Corrija os itens Críticos e mostre ao usuário os Importantes.
