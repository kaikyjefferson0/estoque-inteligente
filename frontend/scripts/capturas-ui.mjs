// Capturas para revisão visual (usado pelo agente ui-reviewer).
// Uso, dentro de frontend:
//   node scripts\capturas-ui.mjs <pasta-de-saida> [endereco-do-site]
// Login real: defina UI_EMAIL e UI_SENHA no ambiente (nunca grave em arquivo).
// Os estados de carregando, erro e vazio do dashboard são simulados
// interceptando GET /dashboard; o resto usa a API de verdade.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const saida = process.argv[2]
const site = (process.argv[3] ?? 'http://localhost:5173').replace(/\/+$/, '')
const email = process.env.UI_EMAIL
const senha = process.env.UI_SENHA

if (!saida) {
  console.error('Informe a pasta de saída: node scripts\\capturas-ui.mjs <pasta> [site]')
  process.exit(1)
}
mkdirSync(saida, { recursive: true })

const LARGURAS = { celular: 375, computador: 1280 }
const ESCALA = new Set([0, 4, 8, 12, 16, 24, 32, 48])
const relatorio = { site, capturas: [], verificacoes: {} }

// Mede o que dá para medir automaticamente; o julgamento visual fica com o revisor
async function verificar(page, nome, largura) {
  const resultado = await page.evaluate(
    ({ escala, largura }) => {
      const fora = []
      const pequenos = []
      const props = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap']
      const descrever = (el) =>
        el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.classList.length ? `.${[...el.classList].join('.')}` : '')
      for (const el of document.querySelectorAll('body *')) {
        const estilo = getComputedStyle(el)
        // option: a lista nativa é desenhada pelo sistema, fora da página
        if (estilo.display === 'none' || el.closest('.visualmente-oculto, svg') || el.matches('option')) continue
        for (const p of props) {
          const v = estilo[p]
          if (!v || v === 'normal' || v === 'auto') continue
          const n = Math.abs(parseFloat(v))
          if (!Number.isNaN(n) && !escala.includes(Math.round(n))) fora.push(`${descrever(el)} ${p}=${v}`)
        }
        if (largura <= 900 && el.matches('a, button, input, [role="menuitem"]')) {
          // Caixa de marcar dentro de um rótulo: o alvo de toque é o rótulo inteiro
          const alvo = el.matches('input[type="checkbox"]') && el.closest('label') ? el.closest('label') : el
          const r = alvo.getBoundingClientRect()
          if (r.width > 0 && r.height > 0 && r.height < 44 && !el.closest('p, dd')) pequenos.push(`${descrever(el)} altura=${Math.round(r.height)}px`)
        }
      }
      const raiz = document.scrollingElement
      return {
        rolagemHorizontal: raiz.scrollWidth > window.innerWidth,
        espacamentoForaDaEscala: [...new Set(fora)].slice(0, 40),
        alvosMenoresQue44px: [...new Set(pequenos)].slice(0, 40),
        fonte: getComputedStyle(document.body).fontFamily,
        fontesCarregadas: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`),
      }
    },
    { escala: [...ESCALA], largura },
  )
  relatorio.verificacoes[nome] = resultado
}

async function capturar(page, nome, largura, { verificarPagina = true } = {}) {
  const arquivo = join(saida, `${nome}.png`)
  await page.screenshot({ path: arquivo, fullPage: true })
  relatorio.capturas.push(arquivo)
  if (verificarPagina) await verificar(page, nome, largura)
}

// ---------- Cadastros de produtos e fornecedores, com a API simulada ----------
// Não precisa de UI_EMAIL/UI_SENHA e não grava nada no banco. Entra como operador
// (RN-19: operador também cadastra e edita).
const FORNECEDORES = [
  { id: 1, nome: 'Distribuidora Vale Verde', cnpj: '12345678000195', criado_em: '2026-09-01T12:00:00Z' },
  { id: 2, nome: 'Laticínios Serra Azul', cnpj: null, criado_em: '2026-09-02T12:00:00Z' },
  { id: 3, nome: 'Atacado Central de Ferragens e Materiais de Construção Ltda', cnpj: '98765432000110', criado_em: '2026-09-03T12:00:00Z' },
]
const PRODUTOS = [
  { id: 1, nome: 'Arroz tipo 1, pacote de 5 kg', codigo_barras: '7891000100103', estoque_minimo: 20, controla_validade: false, dias_alerta_validade: null, fornecedor_id: 1, criado_em: '2026-09-10T13:30:00Z' },
  { id: 2, nome: 'Leite integral UHT 1 L', codigo_barras: '7896051111016', estoque_minimo: 48, controla_validade: true, dias_alerta_validade: 10, fornecedor_id: 2, criado_em: '2026-09-11T09:00:00Z' },
  { id: 3, nome: 'Parafuso sextavado zincado M8 x 40 mm, caixa com 100 unidades', codigo_barras: '7899999000123', estoque_minimo: 1200, controla_validade: false, dias_alerta_validade: null, fornecedor_id: null, criado_em: '2026-09-12T10:00:00Z' },
  { id: 4, nome: 'Café torrado e moído 500 g', codigo_barras: '7896005800018', estoque_minimo: 12, controla_validade: true, dias_alerta_validade: 30, fornecedor_id: 3, criado_em: '2026-09-13T15:45:00Z' },
]
const CAMINHO_API = /^\/(auth|dashboard|products|suppliers)(\/|$)/

async function simularApi(page, cenario) {
  const json = (rota, status, corpo) => rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) })
  await page.route(
    (url) => CAMINHO_API.test(url.pathname),
    async (rota) => {
      const req = rota.request()
      const url = new URL(req.url())
      const partes = url.pathname.split('/').filter(Boolean)
      const metodo = req.method()
      if (partes[0] === 'auth' && partes[1] === 'login') return json(rota, 200, { access_token: 'simulado', token_type: 'bearer' })
      if (partes[0] === 'auth') {
        return json(rota, 200, { id: 9, nome: 'Ana Operadora', email: 'ana@exemplo.com', perfil: 'operador', ativo: true, criado_em: '2026-01-01T00:00:00Z' })
      }
      if (partes[0] === 'dashboard') {
        return json(rota, 200, { total_produtos: 4, produtos_estoque_baixo: 0, produtos_sem_estoque: 0, lotes_a_vencer: 0, lotes_vencidos: 0, alertas_ativos: 0, ultimas_movimentacoes: [] })
      }
      const estado = cenario[partes[0]]
      if (metodo === 'GET' && partes.length === 1) {
        if (estado === 'carregando') return new Promise(() => {})
        if (estado === 'erro') return json(rota, 500, {})
        if (estado === 'vazio') return json(rota, 200, [])
      }
      if (partes[0] === 'suppliers') {
        if (metodo === 'GET' && partes.length === 1) return json(rota, 200, FORNECEDORES)
        if (metodo === 'GET') {
          const f = FORNECEDORES.find((x) => x.id === Number(partes[1]))
          return f ? json(rota, 200, f) : json(rota, 404, { detail: 'Fornecedor não encontrado' })
        }
        const corpo = req.postDataJSON()
        if (corpo.cnpj === '12345678000195') return json(rota, 409, { detail: 'CNPJ já cadastrado' })
        return json(rota, metodo === 'POST' ? 201 : 200, { id: 10, nome: 'Novo', cnpj: null, criado_em: new Date().toISOString(), ...corpo })
      }
      // products
      cenario.chamadasProdutos = (cenario.chamadasProdutos ?? 0) + (metodo === 'GET' && partes.length === 1 ? 1 : 0)
      if (metodo === 'GET' && partes.length === 1) {
        const busca = (url.searchParams.get('busca') ?? '').toLowerCase()
        return json(rota, 200, PRODUTOS.filter((p) => !busca || p.nome.toLowerCase().includes(busca) || p.codigo_barras.includes(busca)))
      }
      const produto = PRODUTOS.find((x) => x.id === Number(partes[1]))
      if (metodo === 'GET' && partes[2] === 'stock') {
        if (!produto) return json(rota, 404, { detail: 'Produto não encontrado' })
        const lotes = produto.id === 2 ? [{ id: 21, validade: '2026-12-01', quantidade: 36 }] : []
        return json(rota, 200, { produto_id: produto.id, saldo_fisico: 36, saldo_disponivel: 36, lotes })
      }
      if (metodo === 'GET') return produto ? json(rota, 200, produto) : json(rota, 404, { detail: 'Produto não encontrado' })
      const corpo = req.postDataJSON()
      if (corpo.codigo_barras === '7891000100103') return json(rota, 409, { detail: 'Código de barras já cadastrado' })
      return json(rota, metodo === 'POST' ? 201 : 200, { ...(produto ?? PRODUTOS[0]), id: produto?.id ?? 1, ...corpo })
    },
  )
}

async function acessibilidadeDoFoco(page) {
  return page.evaluate(() => {
    const ativo = document.activeElement
    const descricao = (ativo?.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent)
      .filter(Boolean)
    return {
      focoNoCampo: ativo?.getAttribute('name') ?? ativo?.tagName,
      ariaInvalid: ativo?.getAttribute('aria-invalid'),
      descricaoLida: descricao,
      regiaoViva: document.querySelector('form [aria-live]')?.textContent ?? null,
    }
  })
}

async function capturarCadastros(rotulo, largura) {
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: largura < 900 ? 812 : 800 },
    reducedMotion: 'reduce',
  })
  const page = await contexto.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(e.message))
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()))
  const cenario = {}
  await simularApi(page, cenario)
  const r = (nome) => `${rotulo}-cad-${nome}`
  const esperarTitulo = (nome) => page.getByRole('heading', { name: nome, level: 1 }).waitFor()

  await page.goto(`${site}/login`)
  await page.getByLabel('E-mail').fill('ana@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('simulada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await esperarTitulo('Painel').catch(() => {})

  // Fornecedores: lista e estados
  await page.goto(`${site}/fornecedores`)
  await page.getByRole('table').waitFor()
  await capturar(page, r('fornecedores-lista'), largura)
  for (const estado of ['carregando', 'erro', 'vazio']) {
    cenario.suppliers = estado
    await page.goto(`${site}/fornecedores`)
    await page.waitForTimeout(400)
    await capturar(page, r(`fornecedores-${estado}`), largura, { verificarPagina: estado === 'vazio' })
  }
  cenario.suppliers = undefined

  // Cadastro de fornecedor: validação, máscara, 409 no campo e confirmação
  await page.goto(`${site}/fornecedores/novo`)
  await esperarTitulo('Cadastrar fornecedor')
  await capturar(page, r('fornecedor-novo'), largura)
  await page.getByLabel('CNPJ (opcional)').fill('1234567')
  await page.getByRole('button', { name: 'Cadastrar fornecedor' }).click()
  relatorio.verificacoes[r('fornecedor-validacao-acessibilidade')] = await acessibilidadeDoFoco(page)
  await capturar(page, r('fornecedor-validacao'), largura, { verificarPagina: false })
  await page.getByLabel('Nome').fill('Distribuidora Vale Verde')
  await page.getByLabel('CNPJ (opcional)').fill('')
  await page.getByLabel('CNPJ (opcional)').pressSequentially('12345678000195')
  relatorio.verificacoes[r('fornecedor-cnpj-mascara')] = await page.getByLabel('CNPJ (opcional)').inputValue()
  await page.getByRole('button', { name: 'Cadastrar fornecedor' }).click()
  await page.locator('.campo__erro', { hasText: 'Este CNPJ já está cadastrado' }).waitFor()
  relatorio.verificacoes[r('fornecedor-cnpj-repetido-acessibilidade')] = await acessibilidadeDoFoco(page)
  await capturar(page, r('fornecedor-cnpj-repetido'), largura, { verificarPagina: false })
  const pedidoCnpj = page.waitForRequest((q) => q.method() === 'POST' && new URL(q.url()).pathname === '/suppliers')
  await page.getByLabel('CNPJ (opcional)').fill('11.222.333/0001-81')
  await page.getByRole('button', { name: 'Cadastrar fornecedor' }).click()
  relatorio.verificacoes[r('fornecedor-cnpj-enviado')] = (await pedidoCnpj).postDataJSON()
  await page.getByRole('status').filter({ hasText: 'Fornecedor cadastrado' }).waitFor()
  await capturar(page, r('fornecedor-cadastrado'), largura, { verificarPagina: false })

  await page.goto(`${site}/fornecedores/3/editar`)
  await page.getByRole('button', { name: 'Salvar alterações' }).waitFor()
  await capturar(page, r('fornecedor-editar'), largura)

  // Produtos: lista, busca com atraso e estados
  await page.goto(`${site}/produtos`)
  await page.getByRole('table').waitFor()
  await capturar(page, r('produtos-lista'), largura)
  cenario.chamadasProdutos = 0
  await page.getByLabel('Buscar por nome ou código de barras').pressSequentially('leite', { delay: 60 })
  await page.waitForTimeout(700)
  relatorio.verificacoes[r('produtos-busca-chamadas-a-api')] = `${cenario.chamadasProdutos} chamada(s) para 5 teclas`
  await capturar(page, r('produtos-busca'), largura, { verificarPagina: false })
  await page.getByLabel('Buscar por nome ou código de barras').fill('xyz')
  await page.locator('.estado__titulo', { hasText: 'Nenhum produto encontrado' }).waitFor()
  await capturar(page, r('produtos-busca-vazia'), largura, { verificarPagina: false })
  for (const estado of ['carregando', 'erro', 'vazio']) {
    cenario.products = estado
    await page.goto(`${site}/produtos`)
    await page.waitForTimeout(400)
    await capturar(page, r(`produtos-${estado}`), largura, { verificarPagina: estado === 'vazio' })
  }
  cenario.products = undefined

  // Cadastro de produto: validação, validade, 409 no campo e confirmação
  await page.goto(`${site}/produtos/novo`)
  await esperarTitulo('Cadastrar produto')
  await capturar(page, r('produto-novo'), largura)
  await page.getByRole('button', { name: 'Cadastrar produto' }).click()
  relatorio.verificacoes[r('produto-validacao-acessibilidade')] = await acessibilidadeDoFoco(page)
  await capturar(page, r('produto-validacao'), largura, { verificarPagina: false })
  await page.getByLabel('Nome').fill('Iogurte natural 170 g')
  await page.getByLabel('Código de barras').fill('7891000100103')
  await page.getByLabel('Estoque mínimo').fill('24')
  await page.getByLabel('Fornecedor (opcional)').selectOption('2')
  await page.getByLabel('Controla validade').check()
  await page.getByRole('button', { name: 'Cadastrar produto' }).click()
  await capturar(page, r('produto-validade-marcada'), largura, { verificarPagina: false })
  // RN-26: desmarcar limpa e esconde os dias
  await page.getByLabel('Dias de alerta').fill('7')
  await page.getByLabel('Controla validade').uncheck()
  await page.getByLabel('Controla validade').check()
  relatorio.verificacoes[r('produto-dias-limpos-ao-desmarcar')] = await page.getByLabel('Dias de alerta').inputValue()
  await page.getByLabel('Dias de alerta').fill('7')
  await page.getByRole('button', { name: 'Cadastrar produto' }).click()
  await page.locator('.campo__erro', { hasText: 'Este código de barras já está cadastrado' }).waitFor()
  relatorio.verificacoes[r('produto-codigo-repetido-acessibilidade')] = await acessibilidadeDoFoco(page)
  await capturar(page, r('produto-codigo-repetido'), largura, { verificarPagina: false })
  await page.getByLabel('Código de barras').fill('7891234567895')
  await page.getByRole('button', { name: 'Cadastrar produto' }).click()
  await page.getByRole('status').filter({ hasText: 'Produto cadastrado' }).waitFor()
  await capturar(page, r('produto-cadastrado'), largura, { verificarPagina: false })

  // Detalhe e edição
  await page.goto(`${site}/produtos/2`)
  await page.locator('dt', { hasText: 'Cadastrado em' }).waitFor()
  await capturar(page, r('produto-detalhe'), largura)
  await page.goto(`${site}/produtos/999`)
  await page.locator('.estado__titulo', { hasText: 'Produto não encontrado' }).waitFor()
  await capturar(page, r('produto-nao-encontrado'), largura, { verificarPagina: false })
  await page.goto(`${site}/produtos/2/editar`)
  await page.locator('.campo__dica', { hasText: 'Não dá para mudar' }).waitFor()
  await capturar(page, r('produto-editar-com-lotes'), largura)
  await page.goto(`${site}/produtos/1/editar`)
  await page.locator('.campo__dica', { hasText: 'Marque para registrar' }).waitFor()
  await page.getByLabel('Nome').focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await capturar(page, r('produto-editar-foco-teclado'), largura, { verificarPagina: false })

  relatorio.verificacoes[r('erros-no-console')] = erros
  await contexto.close()
}

const navegador = await chromium.launch()
try {
  for (const [rotulo, largura] of Object.entries(LARGURAS)) {
    // reducedMotion: menus e gaveta aparecem já abertos, sem captura no meio da animação
    const contexto = await navegador.newContext({
      viewport: { width: largura, height: largura < 900 ? 812 : 800 },
      reducedMotion: 'reduce',
    })
    const page = await contexto.newPage()
    const erros = []
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()))

    // Login: vazio, validação, foco pelo teclado, credencial errada
    await page.goto(`${site}/login`)
    await page.waitForLoadState('networkidle')
    await capturar(page, `${rotulo}-login`, largura)

    await page.getByRole('button', { name: 'Entrar' }).click()
    await capturar(page, `${rotulo}-login-validacao`, largura, { verificarPagina: false })
    // Padrão de formulário: foco no primeiro inválido, erro ligado ao campo, anúncio na região viva
    relatorio.verificacoes[`${rotulo}-login-validacao-acessibilidade`] = await page.evaluate(() => {
      const ativo = document.activeElement
      const descricao = (ativo?.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent)
        .filter(Boolean)
      return {
        focoNoCampo: ativo?.getAttribute('name') ?? ativo?.tagName,
        ariaInvalid: ativo?.getAttribute('aria-invalid'),
        descricaoLida: descricao,
        regiaoViva: document.querySelector('[aria-live]')?.textContent ?? null,
      }
    })
    // Editar o campo apaga o erro só dele
    await page.getByLabel('E-mail').fill('a')
    relatorio.verificacoes[`${rotulo}-login-erro-some-ao-editar`] = await page.evaluate(() => ({
      erroDoEmail: document.querySelector('input[name="email"]')?.getAttribute('aria-invalid'),
      erroDaSenha: document.querySelector('input[name="senha"]')?.getAttribute('aria-invalid'),
    }))
    await capturar(page, `${rotulo}-login-erro-some-ao-editar`, largura, { verificarPagina: false })

    await page.getByLabel('E-mail').fill('ninguem@exemplo.com')
    await page.getByLabel('Senha', { exact: true }).fill('senha-errada-123')
    await page.keyboard.press('Tab')
    await capturar(page, `${rotulo}-login-foco-teclado`, largura, { verificarPagina: false })
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.getByRole('alert').waitFor()
    await capturar(page, `${rotulo}-login-erro`, largura, { verificarPagina: false })

    if (!email || !senha) {
      relatorio.aviso = 'UI_EMAIL e UI_SENHA não definidos: telas logadas não capturadas.'
      await contexto.close()
      continue
    }

    // Painel real
    await page.getByLabel('E-mail').fill(email)
    await page.getByLabel('Senha', { exact: true }).fill(senha)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.getByRole('heading', { name: 'Painel' }).waitFor()
    // Espera a resposta de /dashboard aparecer (networkidle passa antes do fetch)
    await page.getByText(/Últimas movimentações|Cadastre seu primeiro produto/).first().waitFor()
    await capturar(page, `${rotulo}-painel`, largura)

    // Foco pelo teclado no primeiro item do menu (computador) ou no botão do menu (celular)
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await capturar(page, `${rotulo}-painel-foco-teclado`, largura, { verificarPagina: false })

    // Menu do usuário aberto
    await page.locator('.usuario').click()
    await page.getByRole('menuitem', { name: 'Sair' }).waitFor()
    await capturar(page, `${rotulo}-menu-usuario`, largura, { verificarPagina: false })
    await page.keyboard.press('Escape')

    if (largura < 900) {
      await page.getByRole('button', { name: 'Abrir menu' }).click()
      await page.getByRole('dialog').waitFor()
      await capturar(page, `${rotulo}-gaveta`, largura)
      await page.keyboard.press('Escape')
    }

    // Página em construção (destaque do item atual no menu)
    await page.goto(`${site}/entrada`)
    await page.getByRole('heading', { name: 'Entrada' }).waitFor()
    await capturar(page, `${rotulo}-em-construcao`, largura, { verificarPagina: false })

    // Estados simulados do painel
    const simular = async (nome, tratar) => {
      await page.route('**/dashboard', tratar)
      await page.goto(`${site}/`)
      await page.waitForTimeout(400)
      await capturar(page, `${rotulo}-painel-${nome}`, largura, { verificarPagina: false })
      await page.unroute('**/dashboard')
    }
    await simular('carregando', () => new Promise(() => {}))
    await simular('erro', (rota) => rota.fulfill({ status: 500, body: '{}', contentType: 'application/json' }))
    await simular('sem-movimentacoes', (rota) =>
      rota.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_produtos: 4,
          produtos_estoque_baixo: 4,
          produtos_sem_estoque: 4,
          lotes_a_vencer: 0,
          lotes_vencidos: 0,
          alertas_ativos: 4,
          ultimas_movimentacoes: [],
        }),
      }),
    )
    await simular('vazio', (rota) =>
      rota.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_produtos: 0,
          produtos_estoque_baixo: 0,
          produtos_sem_estoque: 0,
          lotes_a_vencer: 0,
          lotes_vencidos: 0,
          alertas_ativos: 0,
          ultimas_movimentacoes: [],
        }),
      }),
    )

    // Dados de exemplo para revisar a tela cheia sem gravar nada no banco
    const agora = Date.now()
    const movimento = (id, tipo, quantidade, produto_nome, validade, minutos) => ({
      id,
      tipo,
      quantidade,
      produto_id: id,
      produto_nome,
      lote_id: 100 + id,
      validade,
      usuario_nome: id % 2 ? 'Maria Souza' : 'João Pereira',
      criado_em: new Date(agora - minutos * 60000).toISOString(),
    })
    await page.route('**/dashboard', (rota) =>
      rota.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_produtos: 128,
          produtos_estoque_baixo: 12,
          produtos_sem_estoque: 3,
          lotes_a_vencer: 0,
          lotes_vencidos: 2,
          alertas_ativos: 17,
          ultimas_movimentacoes: [
            movimento(1, 'entrada', 240, 'Arroz tipo 1, pacote de 5 kg', '2027-03-12', 4),
            movimento(2, 'saida', 36, 'Leite integral UHT 1 L', '2026-11-20', 30),
            movimento(3, 'ajuste', -4, 'Detergente neutro 500 ml', null, 95),
            movimento(4, 'saida', 1200, 'Parafuso sextavado zincado M8 x 40 mm, caixa com 100 unidades', null, 600),
            movimento(5, 'entrada', 18, 'Café torrado e moído 500 g', '2027-06-01', 1500),
          ],
        }),
      }),
    )
    await page.goto(`${site}/`)
    await page.getByText('Últimas movimentações').waitFor()
    await capturar(page, `${rotulo}-painel-com-dados`, largura)
    await page.unroute('**/dashboard')

    relatorio.verificacoes[`${rotulo}-erros-no-console`] = erros
    await contexto.close()
  }

  for (const [rotulo, largura] of Object.entries(LARGURAS)) {
    await capturarCadastros(rotulo, largura)
  }
} finally {
  await navegador.close()
}

writeFileSync(join(saida, 'relatorio.json'), JSON.stringify(relatorio, null, 2))
console.log(`Capturas em ${saida}`)
console.log(JSON.stringify(relatorio, null, 2))
