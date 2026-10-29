import { expect, test, type Browser, type Page } from '@playwright/test'

// Revisão de responsividade contra a API real, com o banco estoque_e2e recriado com os dados de
// exemplo da demo e os casos extremos (backend\tests\e2e_preparar.py --demo). O e2e\rodar.mjs
// roda este arquivo depois do estoque.spec.ts, que precisa do banco vazio.
//
// Em cada largura, percorre as telas e falha se houver rolagem horizontal, algo além da tela,
// texto grudado (ao copiar ou no leitor de tela), texto sobreposto, alvo de toque abaixo de 44px no celular ou
// janela maior que a tela. Com E2E_CAPTURAS=<pasta>, guarda uma captura de cada tela (para o ui-reviewer).

const ADMIN = { email: 'admin.e2e@exemplo.com.br', senha: lerSenha('E2E_SENHA_ADMIN') }
const API = 'http://127.0.0.1:8001'
const PASTA_CAPTURAS = process.env.E2E_CAPTURAS

// Os mesmos textos do e2e_preparar.py
const PRODUTO_LONGO = 'Achocolatado em pó com vitaminas e minerais, pacote de 800 g'
const FORNECEDOR_LONGO = 'Distribuidora Nacional de Alimentos, Bebidas e Produtos de Limpeza Ltda'
const USUARIO_LONGO = 'Maria Aparecida dos Santos Albuquerque de Oliveira Figueiredo'
const EMAIL_LONGO = 'maria.aparecida.albuquerque.figueiredo@distribuidoras.com.br'
const CODIGO_LONGO = '7896000000998'

// Celular, tablet e computador; a última simula o zoom de 200% do navegador em 1280px
// (metade da largura em pixels CSS, com o dobro de densidade)
const LARGURAS = [
  { nome: '320', largura: 320, altura: 640 },
  { nome: '360', largura: 360, altura: 740 },
  { nome: '375', largura: 375, altura: 740 },
  { nome: '390', largura: 390, altura: 780 },
  { nome: '414', largura: 414, altura: 800 },
  { nome: '768', largura: 768, altura: 1024 },
  { nome: '1024', largura: 1024, altura: 768 },
  { nome: '1280', largura: 1280, altura: 800 },
  { nome: '1440', largura: 1440, altura: 900 },
  { nome: '1280-zoom-200', largura: 640, altura: 400, escala: 2 },
]
// Abaixo disto o tema usa alvos de 44px (theme.css)
const LARGURA_CELULAR = 900

function lerSenha(variavel: string): string {
  const senha = process.env[variavel]
  if (!senha) throw new Error(`${variavel} ausente: rode pelo npm run test:e2e.`)
  return senha
}

interface Ids {
  produto: number
  fornecedor: number
  usuario: number
}

interface Tela {
  nome: string
  abrir: (page: Page, ids: Ids) => Promise<void>
  // Só nas larguras em que existe (ex.: a gaveta do menu)
  quando?: (largura: number) => boolean
}

async function irPara(page: Page, caminho: string) {
  await page.goto(caminho)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('main .estado[role="status"]')).toHaveCount(0)
}

async function lerCodigo(page: Page, caminho: string) {
  await irPara(page, caminho)
  await page.getByLabel('Código de barras').fill(CODIGO_LONGO)
  await page.getByLabel('Código de barras').press('Enter')
  await expect(page.locator('main').getByText(PRODUTO_LONGO).first()).toBeVisible()
}

const TELAS: Tela[] = [
  { nome: 'painel', abrir: (p) => irPara(p, '/') },
  { nome: 'estoque', abrir: (p) => irPara(p, '/estoque') },
  { nome: 'produtos', abrir: (p) => irPara(p, '/produtos') },
  {
    nome: 'produto-detalhe',
    abrir: async (p, ids) => {
      await irPara(p, `/produtos/${ids.produto}`)
      await expect(p.getByRole('heading', { name: PRODUTO_LONGO })).toBeVisible()
    },
  },
  { nome: 'produto-novo', abrir: (p) => irPara(p, '/produtos/novo') },
  {
    nome: 'produto-editar',
    abrir: async (p, ids) => {
      await irPara(p, `/produtos/${ids.produto}/editar`)
      await expect(p.getByLabel('Nome')).toHaveValue(PRODUTO_LONGO)
    },
  },
  { nome: 'fornecedores', abrir: (p) => irPara(p, '/fornecedores') },
  { nome: 'fornecedor-novo', abrir: (p) => irPara(p, '/fornecedores/novo') },
  {
    nome: 'fornecedor-editar',
    abrir: async (p, ids) => {
      await irPara(p, `/fornecedores/${ids.fornecedor}/editar`)
      await expect(p.getByLabel('Nome')).toHaveValue(FORNECEDOR_LONGO)
    },
  },
  { nome: 'entrada', abrir: (p) => lerCodigo(p, '/entrada') },
  { nome: 'saida', abrir: (p) => lerCodigo(p, '/saida') },
  {
    nome: 'ajustes-confirmacao',
    abrir: async (p) => {
      await irPara(p, '/ajustes')
      await p.getByRole('combobox', { name: 'Produto' }).fill('achocolatado')
      await p.getByRole('option', { name: new RegExp(PRODUTO_LONGO.slice(0, 20)) }).click()
      await p.getByRole('radio').first().check()
      await p.getByLabel('Saldo contado').fill('99998')
      await p.getByLabel('Motivo').fill('Contagem do inventário com uma caixa avariada no depósito dos fundos')
      await p.getByRole('button', { name: 'Revisar ajuste' }).click()
      await expect(p.getByRole('alertdialog')).toBeVisible()
    },
  },
  { nome: 'alertas', abrir: (p) => irPara(p, '/alertas') },
  { nome: 'usuarios', abrir: (p) => irPara(p, '/usuarios') },
  {
    nome: 'usuarios-definir-senha',
    abrir: async (p) => {
      await irPara(p, '/usuarios')
      await p.getByRole('button', { name: `Definir nova senha de ${USUARIO_LONGO}` }).filter({ visible: true }).click()
      await expect(p.getByRole('alertdialog')).toBeVisible()
    },
  },
  { nome: 'usuario-novo', abrir: (p) => irPara(p, '/usuarios/novo') },
  {
    nome: 'usuario-editar',
    abrir: async (p, ids) => {
      await irPara(p, `/usuarios/${ids.usuario}/editar`)
      // Na edição o e-mail é texto (não muda), mostrado inteiro
      await expect(p.locator('main').getByText(EMAIL_LONGO)).toBeVisible()
    },
  },
  {
    nome: 'usuario-desativar-confirmacao',
    abrir: async (p, ids) => {
      await irPara(p, `/usuarios/${ids.usuario}/editar`)
      await p.getByLabel('Usuário ativo').uncheck()
      await p.locator('main').getByRole('button', { name: /Salvar/ }).click()
      await expect(p.getByRole('alertdialog')).toBeVisible()
    },
  },
  { nome: 'minha-conta', abrir: (p) => irPara(p, '/minha-conta') },
  { nome: 'nao-encontrada', abrir: (p) => irPara(p, '/pagina-que-nao-existe') },
  {
    nome: 'menu-da-conta',
    abrir: async (p) => {
      await irPara(p, '/')
      await p.getByRole('button', { name: /abrir menu da conta/ }).click()
      await expect(p.getByRole('menu')).toBeVisible()
    },
  },
  {
    nome: 'gaveta-do-menu',
    quando: (largura) => largura < LARGURA_CELULAR,
    abrir: async (p) => {
      await irPara(p, '/')
      await p.getByRole('button', { name: 'Abrir menu', exact: true }).click()
      await expect(p.getByRole('dialog')).toBeVisible()
    },
  },
]

/** Mede a tela aberta; devolve a lista de problemas (vazia se está tudo certo). */
async function medir(page: Page, celular: boolean): Promise<string[]> {
  // Mede a tela parada: uma gaveta ou janela ainda entrando estaria fora da tela por um instante
  await page.waitForFunction(() => document.getAnimations().every((animacao) => animacao.playState !== 'running'))
  return page.evaluate((celular) => {
    const problemas: string[] = []
    const largura = window.innerWidth
    const altura = window.innerHeight
    const descrever = (el: Element) =>
      el.tagName.toLowerCase() + (el.classList.length ? `.${[...el.classList].join('.')}` : '')

    // 1. Rolagem horizontal da página e elementos além da tela
    const raiz = document.scrollingElement ?? document.documentElement
    if (raiz.scrollWidth > largura) problemas.push(`rolagem horizontal: ${raiz.scrollWidth}px numa tela de ${largura}px`)
    for (const el of document.querySelectorAll('body *')) {
      if (el.closest('.visualmente-oculto, svg')) continue
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      // Dentro de uma área com rolagem própria (ex.: a lista de opções), a borda é a dela
      let pai = el.parentElement
      let cortado = false
      while (pai && pai !== document.body) {
        const estilo = getComputedStyle(pai)
        if (estilo.overflowX !== 'visible') {
          cortado = true
          break
        }
        pai = pai.parentElement
      }
      if (!cortado && (r.right > largura + 1 || r.left < -1)) problemas.push(`além da tela: ${descrever(el)} (${Math.round(r.left)} a ${Math.round(r.right)}px)`)
    }

    // 2. Texto grudado: o que a cópia leva (a serialização da seleção) entre dois textos vizinhos
    // de elementos diferentes precisa ter espaço ou quebra de linha entre letras e números
    const textos: Text[] = []
    const andador = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        const el = n.parentElement
        if (!el || !(n as Text).data.trim() || el.closest('svg, script, style, noscript, option, textarea')) return NodeFilter.FILTER_REJECT
        return el.checkVisibility() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
      },
    })
    for (let n = andador.nextNode(); n; n = andador.nextNode()) textos.push(n as Text)
    const selecao = window.getSelection()
    if (selecao) {
      for (let i = 1; i < textos.length; i++) {
        const a = textos[i - 1]
        const b = textos[i]
        if (a.parentElement === b.parentElement && a.nextSibling === b) continue
        const fimA = a.data.trimEnd().length - 1
        const inicioB = b.data.length - b.data.trimStart().length
        const intervalo = document.createRange()
        intervalo.setStart(a, fimA)
        intervalo.setEnd(b, inicioB + 1)
        selecao.removeAllRanges()
        selecao.addRange(intervalo)
        const copiado = selecao.toString()
        if (/^[\p{L}\p{N}:;,.!?)%][\p{L}\p{N}(+−-]$/u.test(copiado)) {
          problemas.push(`texto grudado: "${a.data.trim().slice(-24)}" + "${b.data.trim().slice(0, 24)}"`)
        }
      }
      selecao.removeAllRanges()
    }

    // 3. Textos sobrepostos, na mesma camada. Camadas próprias: janelas e menus (cobrem a página
    // de propósito) e o que é fixo ou grudado na tela (o cabeçalho, com a página rolada).
    // Cada caixa é recortada pelos pais com overflow: linhas escondidas pelas reticências não contam.
    const camada = (el: Element): Element | null => {
      for (let atual: Element | null = el; atual && atual !== document.body; atual = atual.parentElement) {
        if (atual.matches('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')) return atual
        const posicao = getComputedStyle(atual).position
        if (posicao === 'fixed' || posicao === 'sticky') return atual
      }
      return null
    }
    const recortar = (r: DOMRect, el: Element) => {
      let { left, top, right, bottom } = r
      // A partir do próprio elemento do texto: é ele que corta o nome com reticências
      for (let pai: Element | null = el; pai && pai !== document.body; pai = pai.parentElement) {
        if (getComputedStyle(pai).overflow === 'visible') continue
        const l = pai.getBoundingClientRect()
        left = Math.max(left, l.left)
        top = Math.max(top, l.top)
        right = Math.min(right, l.right)
        bottom = Math.min(bottom, l.bottom)
      }
      return right - left > 1 && bottom - top > 1 ? { left, top, right, bottom } : null
    }
    const caixas: { r: { left: number; top: number; right: number; bottom: number }; no: Text; camada: Element | null }[] = []
    for (const t of textos) {
      const el = t.parentElement!
      if (el.closest('.visualmente-oculto')) continue
      const intervalo = document.createRange()
      intervalo.selectNodeContents(t)
      const nivel = camada(el)
      for (const r of intervalo.getClientRects()) {
        const visivel = recortar(r, el)
        if (visivel) caixas.push({ r: visivel, no: t, camada: nivel })
      }
    }
    // Folga de 4px: as caixas das letras de linhas vizinhas podem se tocar sem sobrepor o texto
    for (let i = 0; i < caixas.length; i++) {
      for (let j = i + 1; j < caixas.length; j++) {
        const a = caixas[i]
        const b = caixas[j]
        if (a.no === b.no || a.camada !== b.camada) continue
        const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
        const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
        if (x > 4 && y > 4) problemas.push(`texto sobreposto: "${a.no.data.trim().slice(0, 24)}" e "${b.no.data.trim().slice(0, 24)}"`)
      }
    }

    // 4. Alvos de toque no celular (link dentro de parágrafo é texto, não alvo)
    if (celular) {
      for (const el of document.querySelectorAll('a, button, input, select, textarea, [role="menuitem"], [role="option"]')) {
        if (el.closest('p, dd, .visualmente-oculto') || !el.checkVisibility()) continue
        const alvo = el.matches('input[type="checkbox"], input[type="radio"]') && el.closest('label') ? el.closest('label')! : el
        const r = alvo.getBoundingClientRect()
        if (r.width > 0 && r.height > 0 && r.height < 44) problemas.push(`alvo pequeno: ${descrever(el)} com ${Math.round(r.height)}px`)
      }
    }

    // 5. Janelas inteiras na tela (com rolagem interna, se precisar)
    for (const janela of document.querySelectorAll('[role="dialog"], [role="alertdialog"]')) {
      const r = janela.getBoundingClientRect()
      if (r.top < -1 || r.left < -1 || r.bottom > altura + 1 || r.right > largura + 1) {
        problemas.push(`janela fora da tela: ${descrever(janela)} (${Math.round(r.width)}x${Math.round(r.height)} numa tela de ${largura}x${altura})`)
      }
    }
    return [...new Set(problemas)]
  }, celular)
}

// Um login só, no começo: o limite de login (RN-47) é de 10 por minuto por IP
let token = ''

test.beforeAll(async ({ browser }) => {
  const contexto = await browser.newContext()
  const page = await contexto.newPage()
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(ADMIN.email)
  await page.getByLabel('Senha', { exact: true }).fill(ADMIN.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Painel', level: 1 })).toBeVisible()
  token = (await page.evaluate(() => sessionStorage.getItem('estoque.token'))) ?? ''
  await contexto.close()
})

async function abrirContexto(browser: Browser, largura: (typeof LARGURAS)[number], logado: boolean): Promise<Page> {
  const contexto = await browser.newContext({
    viewport: { width: largura.largura, height: largura.altura },
    deviceScaleFactor: largura.escala ?? 1,
  })
  if (logado) await contexto.addInitScript((valor) => sessionStorage.setItem('estoque.token', valor), token)
  return contexto.newPage()
}

/** Ids dos casos extremos, pela API, com o token da sessão. */
async function lerIds(page: Page): Promise<Ids> {
  return page.evaluate(
    async ({ api, produto, fornecedor, email }) => {
      const token = sessionStorage.getItem('estoque.token')
      const ler = async (caminho: string) =>
        (await fetch(`${api}${caminho}`, { headers: { Authorization: `Bearer ${token}` } })).json()
      const produtos = await ler(`/products?busca=${encodeURIComponent(produto)}`)
      const fornecedores = await ler(`/suppliers?busca=${encodeURIComponent(fornecedor)}`)
      const usuarios = await ler('/users?limite=200')
      return {
        produto: produtos.itens[0].id,
        fornecedor: fornecedores.itens[0].id,
        usuario: usuarios.itens.find((u: { email: string }) => u.email === email).id,
      }
    },
    { api: API, produto: PRODUTO_LONGO, fornecedor: FORNECEDOR_LONGO, email: EMAIL_LONGO },
  )
}

async function capturar(page: Page, nome: string) {
  if (!PASTA_CAPTURAS) return
  // Com janela aberta, só a tela: a captura da página inteira desloca o cabeçalho fixo atrás dela
  const janela = await page.locator('[role="dialog"], [role="alertdialog"], [role="menu"]').count()
  await page.screenshot({ path: `${PASTA_CAPTURAS}/${nome}.png`, fullPage: janela === 0 })
}

for (const largura of LARGURAS) {
  test(`telas sem rolagem horizontal nem texto grudado em ${largura.nome}px`, async ({ browser }) => {
    test.setTimeout(240_000)
    const celular = largura.largura < LARGURA_CELULAR
    const problemas: string[] = []

    // Login, antes de entrar
    const login = await abrirContexto(browser, largura, false)
    await login.goto('/login')
    await expect(login.getByRole('heading', { name: 'Entrar' })).toBeVisible()
    problemas.push(...(await medir(login, celular)).map((p) => `login: ${p}`))
    await capturar(login, `${largura.nome}-login`)
    await login.context().close()

    const page = await abrirContexto(browser, largura, true)
    await irPara(page, '/')
    const ids = await lerIds(page)
    for (const tela of TELAS) {
      if (tela.quando && !tela.quando(largura.largura)) continue
      await tela.abrir(page, ids)
      problemas.push(...(await medir(page, celular)).map((p) => `${tela.nome}: ${p}`))
      await capturar(page, `${largura.nome}-${tela.nome}`)
      // Fecha janela ou menu aberto antes da próxima tela
      await page.keyboard.press('Escape')
    }
    await page.context().close()

    expect(problemas, `Problemas em ${largura.nome}px`).toEqual([])
  })
}
