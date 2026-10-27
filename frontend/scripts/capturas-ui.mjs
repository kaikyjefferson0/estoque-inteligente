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
          // Caixa de marcar ou rádio dentro de um rótulo: o alvo de toque é o rótulo inteiro
          const alvo = el.matches('input[type="checkbox"], input[type="radio"]') && el.closest('label') ? el.closest('label') : el
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
const CAMINHO_API = /^\/(auth|dashboard|products|suppliers|alerts)(\/|$)/

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
      // Contagem do menu: sem alertas nos cadastros
      if (partes[0] === 'alerts') return json(rota, 200, [])
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
        const lotes = produto.id === 2 ? [{ id: 21, validade: '2026-12-01', quantidade: 36, situacao: 'ok' }] : []
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
      regiaoViva: (ativo?.form ?? ativo?.closest('form'))?.querySelector('[aria-live]')?.textContent ?? null,
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

// ---------- Estoque, entrada, saída e ajuste, com a API simulada ----------
// Datas relativas a hoje, para o lote vencido e o lote a vencer continuarem assim
const diaIso = (deslocamento) => {
  const hojeSp = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const d = new Date(`${hojeSp}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + deslocamento)
  return d.toISOString().slice(0, 10)
}

function dadosDoEstoque() {
  const ESTOQUE = [
    { produto_id: 1, nome: 'Arroz tipo 1, pacote de 5 kg', codigo_barras: '7891000100103', saldo_fisico: 15, saldo_disponivel: 15, estoque_minimo: 20, situacao: 'baixo' },
    { produto_id: 4, nome: 'Café torrado e moído 500 g', codigo_barras: '7896005800018', saldo_fisico: 0, saldo_disponivel: 0, estoque_minimo: 12, situacao: 'sem_estoque' },
    { produto_id: 2, nome: 'Leite integral UHT 1 L', codigo_barras: '7896051111016', saldo_fisico: 48, saldo_disponivel: 42, estoque_minimo: 24, situacao: 'ok' },
    { produto_id: 3, nome: 'Parafuso sextavado zincado M8 x 40 mm, caixa com 100 unidades', codigo_barras: '7899999000123', saldo_fisico: 3400, saldo_disponivel: 3400, estoque_minimo: 1200, situacao: 'ok' },
  ]
  const LOTES = {
    1: [{ id: 11, validade: null, quantidade: 15, situacao: 'ok' }],
    2: [
      { id: 21, validade: diaIso(-7), quantidade: 6, situacao: 'vencido' },
      { id: 22, validade: diaIso(5), quantidade: 12, situacao: 'a_vencer' },
      { id: 23, validade: diaIso(80), quantidade: 30, situacao: 'ok' },
    ],
    3: [{ id: 31, validade: null, quantidade: 3400, situacao: 'ok' }],
    4: [],
  }
  const agora = Date.now()
  const mov = (id, tipo, quantidade, lote, minutos, extra = {}) => ({
    id,
    tipo,
    quantidade,
    lote_id: lote.id,
    validade: lote.validade,
    motivo: null,
    saldo_anterior: null,
    saldo_novo: null,
    usuario_id: id % 2 ? 1 : 2,
    usuario_nome: id % 2 ? 'Maria Souza' : 'João Pereira',
    criado_em: new Date(agora - minutos * 60000).toISOString(),
    ...extra,
  })
  const [vencido, aVencer, bom] = LOTES[2]
  const MOVIMENTOS = {
    2: [
      mov(7, 'ajuste', -2, aVencer, 30, { motivo: 'Duas caixas amassadas na prateleira', saldo_anterior: 14, saldo_novo: 12 }),
      mov(6, 'saida', 20, bom, 180),
      mov(5, 'saida', 4, aVencer, 180),
      mov(4, 'entrada', 50, bom, 1500),
      mov(3, 'entrada', 18, aVencer, 4000),
      mov(2, 'entrada', 6, vencido, 9000),
    ],
    1: [mov(1, 'entrada', 15, LOTES[1][0], 60)],
  }
  return { ESTOQUE, LOTES, MOVIMENTOS }
}

const USUARIOS = [
  { id: 1, nome: 'Carla Administradora', email: 'carla@exemplo.com', perfil: 'admin', ativo: true, criado_em: '2026-01-01T00:00:00Z' },
  { id: 2, nome: 'João Pereira', email: 'joao@exemplo.com', perfil: 'operador', ativo: true, criado_em: '2026-02-01T00:00:00Z' },
  { id: 3, nome: 'Maria Souza', email: 'maria.souza@exemplo.com', perfil: 'operador', ativo: false, criado_em: '2026-03-01T00:00:00Z' },
  { id: 4, nome: 'Roberto de Albuquerque Lima Filho', email: 'roberto.albuquerque.lima@distribuidora-exemplo.com.br', perfil: 'admin', ativo: true, criado_em: '2026-04-01T00:00:00Z' },
]

function dadosDosAlertas() {
  const agora = Date.now()
  const atras = (minutos) => new Date(agora - minutos * 60000).toISOString()
  return [
    { id: 6, tipo: 'estoque_baixo', produto_id: 4, produto_nome: 'Café torrado e moído 500 g', lote_id: null, validade: null, criado_em: atras(10), resolvido_em: null },
    { id: 5, tipo: 'vencido', produto_id: 2, produto_nome: 'Leite integral UHT 1 L', lote_id: 21, validade: diaIso(-7), criado_em: atras(120), resolvido_em: null },
    { id: 4, tipo: 'estoque_baixo', produto_id: 1, produto_nome: 'Arroz tipo 1, pacote de 5 kg', lote_id: null, validade: null, criado_em: atras(1560), resolvido_em: null },
    { id: 3, tipo: 'vencimento_proximo', produto_id: 2, produto_nome: 'Leite integral UHT 1 L', lote_id: 22, validade: diaIso(5), criado_em: atras(4320), resolvido_em: null },
    { id: 2, tipo: 'vencimento_proximo', produto_id: 2, produto_nome: 'Leite integral UHT 1 L', lote_id: 21, validade: diaIso(-7), criado_em: atras(20000), resolvido_em: atras(10000) },
    { id: 1, tipo: 'estoque_baixo', produto_id: 3, produto_nome: 'Parafuso sextavado zincado M8 x 40 mm, caixa com 100 unidades', lote_id: null, validade: null, criado_em: atras(30000), resolvido_em: atras(18000) },
  ]
}

async function simularEstoque(page, cenario, perfil) {
  const { ESTOQUE, LOTES, MOVIMENTOS } = dadosDoEstoque()
  const ALERTAS = dadosDosAlertas()
  const json = (rota, status, corpo) => rota.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) })
  await page.route(
    (url) => /^\/(auth|dashboard|products|suppliers|stock|alerts|users)(\/|$)/.test(url.pathname),
    async (rota) => {
      const req = rota.request()
      const url = new URL(req.url())
      const partes = url.pathname.split('/').filter(Boolean)
      const metodo = req.method()
      if (partes[0] === 'auth' && partes[1] === 'login') return json(rota, 200, { access_token: 'simulado', token_type: 'bearer' })
      if (partes[0] === 'auth') {
        const nome = perfil === 'admin' ? 'Carla Administradora' : 'Ana Operadora'
        return json(rota, 200, { id: 1, nome, email: 'teste@exemplo.com', perfil, ativo: true, criado_em: '2026-01-01T00:00:00Z' })
      }
      if (partes[0] === 'dashboard') {
        return json(rota, 200, { total_produtos: 4, produtos_estoque_baixo: 2, produtos_sem_estoque: 1, lotes_a_vencer: 1, lotes_vencidos: 1, alertas_ativos: 4, ultimas_movimentacoes: [] })
      }
      if (partes[0] === 'suppliers') return json(rota, 200, FORNECEDORES)

      if (partes[0] === 'alerts') {
        if (partes[1] === 'generate') {
          if (cenario.gerar === 'erro') return json(rota, 500, {})
          return json(rota, 200, { criados: 1, resolvidos: 2 })
        }
        // A contagem do menu (sem filtro) não entra nos estados simulados da lista
        const daLista = url.search !== ''
        if (cenario.alerts === 'carregando' && daLista) return new Promise(() => {})
        if (cenario.alerts === 'erro' && daLista) return json(rota, 500, {})
        if (cenario.alerts === 'vazio') return json(rota, 200, [])
        const tipo = url.searchParams.get('tipo')
        const comResolvidos = url.searchParams.get('incluir_resolvidos') === 'true'
        return json(rota, 200, ALERTAS.filter((a) => (!tipo || a.tipo === tipo) && (comResolvidos || !a.resolvido_em)))
      }
      if (partes[0] === 'users') {
        const id = Number(partes[1])
        if (metodo === 'GET' && !partes[1]) {
          if (cenario.users === 'carregando') return new Promise(() => {})
          if (cenario.users === 'erro') return json(rota, 500, {})
          return json(rota, 200, USUARIOS)
        }
        const usuario = USUARIOS.find((u) => u.id === id)
        if (metodo === 'GET') return usuario ? json(rota, 200, usuario) : json(rota, 404, { detail: 'Usuário não encontrado' })
        const corpo = req.postDataJSON()
        if (metodo === 'POST') {
          if (corpo.email === 'joao@exemplo.com') return json(rota, 409, { detail: 'Este e-mail já está cadastrado. Use outro e-mail.' })
          const { senha: _senha, ...semSenha } = corpo
          return json(rota, 201, { id: 10, ativo: true, criado_em: new Date().toISOString(), ...semSenha })
        }
        if (id === 1 && corpo.ativo === false) return json(rota, 409, { detail: 'Você não pode desativar o próprio usuário. Peça a outro administrador, se precisar.' })
        return json(rota, 200, { ...usuario, ...corpo })
      }

      if (partes[0] === 'stock' && metodo === 'GET') {
        if (cenario.stock === 'carregando') return new Promise(() => {})
        if (cenario.stock === 'erro') return json(rota, 500, {})
        if (cenario.stock === 'vazio') return json(rota, 200, [])
        const situacao = url.searchParams.get('situacao')
        const filtrado = ESTOQUE.filter((i) => !situacao || (situacao === 'baixo' ? i.situacao !== 'ok' : i.situacao === situacao))
        return json(rota, 200, filtrado)
      }
      if (partes[0] === 'stock' && partes[1] === 'entries') {
        const corpo = req.postDataJSON()
        cenario.ultimaEntrada = corpo
        const produto = PRODUTOS.find((p) => p.codigo_barras === corpo.codigo_barras)
        if (!produto) return json(rota, 404, { detail: 'Produto não encontrado' })
        if (corpo.validade === '2030-02-02') return json(rota, 422, { detail: 'Esta validade já passou e produto vencido não entra no estoque. Informe uma data a partir de hoje.' })
        return json(rota, 201, {
          movimentacao_id: 99, produto_id: produto.id, lote_id: 24, validade: corpo.validade, quantidade: corpo.quantidade,
          quantidade_lote: corpo.quantidade + (corpo.validade ? 0 : 15), saldo_total: 48 + corpo.quantidade, usuario_id: 1, criado_em: new Date().toISOString(),
        })
      }
      if (partes[0] === 'stock' && partes[1] === 'exits') {
        const corpo = req.postDataJSON()
        const produto = PRODUTOS.find((p) => p.codigo_barras === corpo.codigo_barras)
        if (!produto) return json(rota, 404, { detail: 'Produto não encontrado' })
        const item = ESTOQUE.find((i) => i.produto_id === produto.id)
        if (corpo.quantidade > item.saldo_disponivel) {
          return json(rota, 409, { detail: `Saldo insuficiente: há ${item.saldo_disponivel} unidades disponíveis e foram pedidas ${corpo.quantidade}. Informe até ${item.saldo_disponivel}.` })
        }
        return json(rota, 201, {
          produto_id: produto.id, quantidade: corpo.quantidade,
          lotes: [
            { movimentacao_id: 100, lote_id: 22, validade: LOTES[2][1].validade, quantidade: 12, quantidade_lote: 0 },
            { movimentacao_id: 101, lote_id: 23, validade: LOTES[2][2].validade, quantidade: corpo.quantidade - 12, quantidade_lote: 42 - corpo.quantidade },
          ],
          saldo_total: 48 - corpo.quantidade, usuario_id: 1, criado_em: new Date().toISOString(),
        })
      }
      if (partes[0] === 'stock' && partes[1] === 'adjustments') {
        const corpo = req.postDataJSON()
        const lote = Object.values(LOTES).flat().find((l) => l.id === corpo.lote_id)
        if (!lote) return json(rota, 404, { detail: 'Lote não encontrado' })
        if (corpo.saldo_contado === lote.quantidade) {
          return json(rota, 409, { detail: `O lote já tem ${lote.quantidade} unidades, igual à contagem. Confira a contagem ou cancele o ajuste.` })
        }
        return json(rota, 201, {
          movimentacao_id: 102, produto_id: 2, lote_id: lote.id, validade: lote.validade, quantidade: corpo.saldo_contado - lote.quantidade,
          saldo_anterior: lote.quantidade, saldo_novo: corpo.saldo_contado, motivo: corpo.motivo, saldo_total: 46, usuario_id: 1, criado_em: new Date().toISOString(),
        })
      }

      // products
      if (metodo === 'GET' && partes.length === 1) {
        const busca = (url.searchParams.get('busca') ?? '').toLowerCase()
        return json(rota, 200, PRODUTOS.filter((p) => !busca || p.nome.toLowerCase().includes(busca) || p.codigo_barras.includes(busca)))
      }
      if (partes[1] === 'by-barcode') {
        cenario.buscasPorCodigo = (cenario.buscasPorCodigo ?? 0) + 1
        const porCodigo = PRODUTOS.find((p) => p.codigo_barras === decodeURIComponent(partes[2] ?? ''))
        return porCodigo ? json(rota, 200, porCodigo) : json(rota, 404, { detail: 'Produto não encontrado' })
      }
      const id = Number(partes[1])
      const produto = PRODUTOS.find((x) => x.id === id)
      if (!produto) return json(rota, 404, { detail: 'Produto não encontrado' })
      if (partes[2] === 'stock') {
        if (cenario.lotes === 'carregando') return new Promise(() => {})
        if (cenario.lotes === 'erro') return json(rota, 500, {})
        const item = ESTOQUE.find((i) => i.produto_id === id)
        return json(rota, 200, { produto_id: id, saldo_fisico: item.saldo_fisico, saldo_disponivel: item.saldo_disponivel, lotes: LOTES[id] })
      }
      if (partes[2] === 'movements') {
        if (cenario.movimentos === 'carregando') return new Promise(() => {})
        if (cenario.movimentos === 'erro') return json(rota, 500, {})
        return json(rota, 200, MOVIMENTOS[id] ?? [])
      }
      return json(rota, 200, produto)
    },
  )
}

async function novaPagina(largura, cenario, perfil) {
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: largura < 900 ? 812 : 800 },
    reducedMotion: 'reduce',
  })
  const page = await contexto.newPage()
  const erros = []
  page.on('pageerror', (e) => erros.push(e.message))
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()))
  await simularEstoque(page, cenario, perfil)
  await page.goto(`${site}/login`)
  await page.getByLabel('E-mail').fill('teste@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('simulada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('heading', { name: 'Painel', level: 1 }).waitFor()
  return { contexto, page, erros }
}

const focoAtual = (page) => page.evaluate(() => document.activeElement?.getAttribute('name') ?? document.activeElement?.tagName)

async function capturarEstoque(rotulo, largura) {
  const cenario = {}
  const { contexto, page, erros } = await novaPagina(largura, cenario, 'admin')
  const r = (nome) => `${rotulo}-est-${nome}`
  const v = (nome, valor) => (relatorio.verificacoes[r(nome)] = valor)

  // Estoque: lista, filtros, busca e estados
  await page.goto(`${site}/estoque`)
  await page.getByRole('table').waitFor()
  await capturar(page, r('estoque-lista'), largura)
  await page.getByRole('radio', { name: 'Estoque baixo' }).check()
  await page.getByRole('status').filter({ hasText: '2 produtos' }).waitFor()
  await capturar(page, r('estoque-filtro-baixo'), largura, { verificarPagina: false })
  await page.getByRole('radio', { name: 'Todos' }).check()
  await page.getByLabel('Buscar por nome ou código de barras').fill('leite')
  await capturar(page, r('estoque-busca'), largura, { verificarPagina: false })
  await page.getByLabel('Buscar por nome ou código de barras').fill('xyz')
  await page.locator('.estado__titulo', { hasText: 'Nenhum produto encontrado' }).waitFor()
  await capturar(page, r('estoque-busca-vazia'), largura, { verificarPagina: false })
  await page.getByLabel('Buscar por nome ou código de barras').fill('')
  await page.keyboard.press('Shift+Tab')
  await capturar(page, r('estoque-foco-teclado-filtro'), largura, { verificarPagina: false })
  for (const estado of ['carregando', 'erro', 'vazio']) {
    cenario.stock = estado
    await page.goto(`${site}/estoque`)
    await page.waitForTimeout(400)
    await capturar(page, r(`estoque-${estado}`), largura, { verificarPagina: estado === 'vazio' })
  }
  cenario.stock = 'vazio'
  await page.goto(`${site}/estoque?situacao=sem_estoque`)
  await page.locator('.estado__titulo', { hasText: 'Nenhum produto sem estoque' }).waitFor()
  await capturar(page, r('estoque-filtro-vazio'), largura, { verificarPagina: false })
  cenario.stock = undefined

  // Detalhe do produto: saldos, lotes FEFO e histórico
  await page.goto(`${site}/produtos/2`)
  await page.locator('.historico__item').first().waitFor()
  await capturar(page, r('detalhe-com-lotes'), largura)
  v('detalhe-lotes-na-tela', await page.locator('.lote').allInnerTexts())
  await page.goto(`${site}/produtos/4`)
  await page.locator('.estado__titulo', { hasText: 'Nenhuma movimentação ainda' }).waitFor()
  await capturar(page, r('detalhe-vazio'), largura, { verificarPagina: false })
  v('detalhe-vazio-nota-de-saldo', await page.locator('.saldos__nota').count())
  cenario.lotes = 'erro'
  cenario.movimentos = 'carregando'
  await page.goto(`${site}/produtos/2`)
  await page.waitForTimeout(500)
  await capturar(page, r('detalhe-lotes-erro-historico-carregando'), largura, { verificarPagina: false })
  cenario.lotes = undefined
  cenario.movimentos = undefined

  // Entrada: cursor no código, Enter busca, produto antes de confirmar, erros no campo, volta ao código
  await page.goto(`${site}/entrada`)
  await page.getByRole('heading', { name: 'Entrada', level: 1 }).waitFor()
  v('entrada-foco-inicial', await focoAtual(page))
  await capturar(page, r('entrada-inicial'), largura)
  await page.keyboard.type('0000000000000')
  await page.keyboard.press('Enter')
  await page.locator('.campo__erro', { hasText: 'Nenhum produto com o código' }).waitFor()
  v('entrada-nao-encontrado-acessibilidade', await acessibilidadeDoFoco(page))
  await capturar(page, r('entrada-nao-encontrado'), largura, { verificarPagina: false })
  await page.getByRole('link', { name: 'Cadastrar produto com este código' }).click()
  await page.getByRole('heading', { name: 'Cadastrar produto', level: 1 }).waitFor()
  v('entrada-cadastro-com-codigo-preenchido', await page.getByLabel('Código de barras').inputValue())
  await page.goto(`${site}/entrada`)
  await page.getByLabel('Código de barras').waitFor()
  await page.getByLabel('Código de barras').fill('7896051111016')
  await page.keyboard.press('Enter')
  await page.getByLabel('Validade').waitFor()
  v('entrada-buscas-pela-rota-exata', cenario.buscasPorCodigo)
  v('entrada-foco-apos-leitura', await focoAtual(page))
  await capturar(page, r('entrada-produto-lido'), largura)
  await page.getByRole('button', { name: 'Registrar entrada' }).click()
  v('entrada-validacao-acessibilidade', await acessibilidadeDoFoco(page))
  await capturar(page, r('entrada-validacao'), largura, { verificarPagina: false })
  await page.getByLabel('Quantidade').fill('12')
  await page.getByLabel('Validade').pressSequentially('02022030')
  await page.getByRole('button', { name: 'Registrar entrada' }).click()
  await page.locator('.campo__erro', { hasText: 'Esta validade já passou' }).waitFor()
  v('entrada-erro-api-acessibilidade', await acessibilidadeDoFoco(page))
  await capturar(page, r('entrada-erro-api-validade'), largura, { verificarPagina: false })
  await page.getByLabel('Validade').fill('')
  await page.getByLabel('Validade').pressSequentially('31012031')
  await page.getByRole('button', { name: 'Registrar entrada' }).click()
  await page.getByRole('status').filter({ hasText: 'Entrada registrada' }).waitFor()
  v('entrada-enviada', cenario.ultimaEntrada)
  v('entrada-foco-apos-salvar', await focoAtual(page))
  await capturar(page, r('entrada-registrada'), largura)
  await page.keyboard.type('7891000100103')
  await page.keyboard.press('Enter')
  await page.getByLabel('Quantidade').waitFor()
  v('entrada-sem-validade-campo-validade-visivel', await page.getByLabel('Validade').count())
  await capturar(page, r('entrada-produto-sem-validade'), largura, { verificarPagina: false })

  // Saída: saldo antes de confirmar, 409 com o disponível, lotes atingidos
  await page.goto(`${site}/saida`)
  await page.getByRole('heading', { name: 'Saída', level: 1 }).waitFor()
  await capturar(page, r('saida-inicial'), largura, { verificarPagina: false })
  await page.keyboard.type('7896051111016')
  await page.keyboard.press('Enter')
  await page.getByLabel('Quantidade').waitFor()
  await capturar(page, r('saida-produto-lido'), largura)
  await page.getByLabel('Quantidade').fill('100')
  await page.getByRole('button', { name: 'Registrar saída' }).click()
  await page.locator('.campo__erro', { hasText: 'Saldo insuficiente' }).waitFor()
  v('saida-409-acessibilidade', await acessibilidadeDoFoco(page))
  await capturar(page, r('saida-saldo-insuficiente'), largura, { verificarPagina: false })
  await page.getByLabel('Quantidade').fill('20')
  await page.getByRole('button', { name: 'Registrar saída' }).click()
  await page.getByRole('status').filter({ hasText: 'Saída registrada' }).waitFor()
  v('saida-foco-apos-salvar', await focoAtual(page))
  await capturar(page, r('saida-registrada'), largura)

  // Ajustes: produto, lote, contado e motivo; sem diferença e confirmação
  await page.goto(`${site}/ajustes`)
  await page.getByLabel('Produto').waitFor()
  await capturar(page, r('ajustes-inicial'), largura)
  await page.getByLabel('Produto').selectOption('2')
  await page.locator('.lote-opcao').first().waitFor()
  await capturar(page, r('ajustes-lotes'), largura)
  await page.getByRole('button', { name: 'Revisar ajuste' }).click()
  v('ajustes-validacao-acessibilidade', await acessibilidadeDoFoco(page))
  await capturar(page, r('ajustes-validacao'), largura, { verificarPagina: false })
  await page.locator('.lote-opcao').nth(1).click()
  await page.getByLabel('Saldo contado').fill('12')
  await page.getByLabel('Motivo').fill('Contagem do inventário')
  await page.getByRole('button', { name: 'Revisar ajuste' }).click()
  await page.locator('.campo__erro', { hasText: 'igual à contagem' }).waitFor()
  v('ajustes-sem-diferenca-acessibilidade', await acessibilidadeDoFoco(page))
  await capturar(page, r('ajustes-sem-diferenca'), largura, { verificarPagina: false })
  await page.getByLabel('Saldo contado').fill('9')
  await page.getByRole('button', { name: 'Revisar ajuste' }).click()
  await page.getByRole('alertdialog').waitFor()
  v('ajustes-confirmacao-texto', await page.getByRole('alertdialog').innerText())
  await capturar(page, r('ajustes-confirmacao'), largura, { verificarPagina: false })
  await page.getByRole('button', { name: 'Registrar ajuste' }).click()
  await page.getByRole('status').filter({ hasText: 'Ajuste registrado' }).waitFor()
  await capturar(page, r('ajustes-registrado'), largura, { verificarPagina: false })
  cenario.stock = 'erro'
  await page.goto(`${site}/ajustes`)
  await page.waitForTimeout(400)
  await capturar(page, r('ajustes-erro'), largura, { verificarPagina: false })
  cenario.stock = undefined

  v('erros-no-console', erros)
  await contexto.close()

  // Operador: o menu esconde Ajustes e a rota leva ao painel
  const operador = await novaPagina(largura, {}, 'operador')
  await operador.page.goto(`${site}/ajustes`)
  await operador.page.getByRole('heading', { name: 'Painel', level: 1 }).waitFor()
  v('operador-em-ajustes-vai-para', new URL(operador.page.url()).pathname)
  v('operador-menu-tem-ajustes', await operador.page.getByRole('link', { name: 'Ajustes' }).count())
  await operador.contexto.close()
}

// ---------- Alertas, usuários e página não encontrada, com a API simulada ----------
async function capturarAlertasEUsuarios(rotulo, largura) {
  const cenario = {}
  const { contexto, page, erros } = await novaPagina(largura, cenario, 'admin')
  const r = (nome) => `${rotulo}-au-${nome}`
  const v = (nome, valor) => (relatorio.verificacoes[r(nome)] = valor)
  const titulo = (nome) => page.getByRole('heading', { name: nome, level: 1 }).waitFor()
  const contagemDoMenu = () => page.evaluate(() => [...document.querySelectorAll('.menu__contagem')].map((el) => el.textContent))

  // Alertas
  await page.goto(`${site}/alertas`)
  await page.locator('.alerta').first().waitFor()
  v('contagem-no-menu', await contagemDoMenu())
  v('titulo-da-aba', await page.title())
  await capturar(page, r('alertas-lista'), largura)
  await page.keyboard.press('Tab')
  await page.locator('.alerta__link').nth(1).focus()
  await capturar(page, r('alertas-foco-teclado'), largura, { verificarPagina: false })
  await page.getByRole('radio', { name: 'Vencido' }).check()
  await page.waitForTimeout(300)
  await capturar(page, r('alertas-filtro-vencido'), largura, { verificarPagina: false })
  await page.getByRole('radio', { name: 'Todos' }).check()
  await page.getByLabel('Mostrar resolvidos').check()
  await page.waitForTimeout(300)
  await capturar(page, r('alertas-com-resolvidos'), largura)
  await page.getByLabel('Mostrar resolvidos').uncheck()
  await page.getByRole('button', { name: 'Verificar agora' }).click()
  await page.getByText('Verificação concluída').waitFor()
  await capturar(page, r('alertas-verificado'), largura, { verificarPagina: false })
  if (largura < 900) {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await page.getByRole('dialog').waitFor()
    await capturar(page, r('gaveta-com-contagem'), largura, { verificarPagina: false })
    await page.keyboard.press('Escape')
  }
  cenario.gerar = 'erro'
  await page.getByRole('button', { name: 'Verificar agora' }).click()
  await page.getByRole('alert').waitFor()
  await capturar(page, r('alertas-verificar-erro'), largura, { verificarPagina: false })
  cenario.gerar = undefined
  for (const estado of ['carregando', 'erro']) {
    cenario.alerts = estado
    await page.goto(`${site}/alertas?tipo=vencido`)
    await page.waitForTimeout(400)
    await capturar(page, r(`alertas-${estado}`), largura, { verificarPagina: false })
  }
  cenario.alerts = 'vazio'
  await page.goto(`${site}/alertas`)
  await page.getByText('Nenhum alerta ativo').waitFor()
  v('contagem-no-menu-com-zero', await contagemDoMenu())
  await capturar(page, r('alertas-vazio'), largura, { verificarPagina: false })
  await page.getByRole('radio', { name: 'Estoque baixo' }).check()
  await page.waitForTimeout(300)
  await capturar(page, r('alertas-filtro-vazio'), largura, { verificarPagina: false })
  cenario.alerts = undefined

  // Usuários
  await page.goto(`${site}/usuarios`)
  await page.getByRole('table').waitFor()
  await capturar(page, r('usuarios-lista'), largura)
  await page.getByRole('link', { name: 'Cadastrar usuário' }).click()
  await titulo('Cadastrar usuário')
  await capturar(page, r('usuario-novo'), largura)
  await page.getByRole('button', { name: 'Cadastrar usuário' }).click()
  v('usuario-validacao-foco', await focoAtual(page))
  await capturar(page, r('usuario-validacao'), largura, { verificarPagina: false })
  await page.getByLabel('Nome').fill('Pedro Alves')
  await page.getByLabel('E-mail').fill('joao@exemplo.com')
  await page.getByLabel('Senha', { exact: true }).fill('senha-boa-123')
  await page.getByLabel('Confirme a senha').fill('senha-outra-123')
  await page.getByRole('button', { name: 'Cadastrar usuário' }).click()
  v('usuario-senhas-diferentes-foco', await focoAtual(page))
  await capturar(page, r('usuario-senhas-diferentes'), largura, { verificarPagina: false })
  await page.getByLabel('Confirme a senha').fill('senha-boa-123')
  await page.getByRole('button', { name: 'Cadastrar usuário' }).click()
  await page.locator('.campo__erro', { hasText: 'Este e-mail já está cadastrado' }).waitFor()
  v('usuario-email-repetido-foco', await focoAtual(page))
  await capturar(page, r('usuario-email-repetido'), largura, { verificarPagina: false })
  await page.getByLabel('E-mail').fill('pedro@exemplo.com')
  await page.getByRole('button', { name: 'Cadastrar usuário' }).click()
  await page.getByText('Usuário cadastrado').waitFor()
  await capturar(page, r('usuario-cadastrado'), largura, { verificarPagina: false })

  await page.goto(`${site}/usuarios/2/editar`)
  await page.getByLabel('Usuário ativo').waitFor()
  v('titulo-da-aba-editar', await page.title())
  await capturar(page, r('usuario-editar'), largura)
  await page.getByLabel('Usuário ativo').uncheck()
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await page.getByRole('alertdialog').waitFor()
  await capturar(page, r('usuario-desativar-confirmacao'), largura, { verificarPagina: false })
  await page.getByRole('button', { name: 'Desativar usuário' }).click()
  await page.getByText('Usuário desativado').waitFor()
  await capturar(page, r('usuario-desativado'), largura, { verificarPagina: false })

  await page.goto(`${site}/usuarios/1/editar`)
  await page.getByLabel('Usuário ativo').waitFor()
  v(
    'proprio-bloqueado',
    await page.evaluate(() => ({
      perfil: document.querySelector('select[name="perfil"]')?.disabled,
      ativo: document.querySelector('input[name="ativo"]')?.disabled,
    })),
  )
  await capturar(page, r('usuario-editar-proprio'), largura, { verificarPagina: false })

  cenario.users = 'erro'
  await page.goto(`${site}/usuarios`)
  await page.waitForTimeout(400)
  await capturar(page, r('usuarios-erro'), largura, { verificarPagina: false })
  cenario.users = undefined

  // Página não encontrada
  await page.goto(`${site}/rota-que-nao-existe`)
  await titulo('Página não encontrada')
  v('titulo-da-aba-404', await page.title())
  await capturar(page, r('nao-encontrada'), largura)

  v('erros-no-console', erros)
  await contexto.close()

  // Operador: sem Usuários no menu, a rota leva ao painel, e vê os alertas
  const operador = await novaPagina(largura, {}, 'operador')
  await operador.page.goto(`${site}/usuarios`)
  await operador.page.getByRole('heading', { name: 'Painel', level: 1 }).waitFor()
  v('operador-em-usuarios-vai-para', new URL(operador.page.url()).pathname)
  v('operador-menu-tem-usuarios', await operador.page.getByRole('link', { name: 'Usuários' }).count())
  await operador.page.goto(`${site}/alertas`)
  await operador.page.locator('.alerta').first().waitFor()
  await capturar(operador.page, r('alertas-operador'), largura, { verificarPagina: false })
  await operador.contexto.close()
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

    // Sem UI_EMAIL/UI_SENHA, o login e o painel usam a API simulada (nada é gravado no banco)
    if (!email || !senha) {
      relatorio.aviso = 'UI_EMAIL e UI_SENHA não definidos: painel capturado com login simulado.'
      const json = (rota, corpo) => rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) })
      await page.route('**/auth/login', (rota) => json(rota, { access_token: 'simulado', token_type: 'bearer' }))
      await page.route('**/auth/me', (rota) =>
        json(rota, { id: 1, nome: 'Carla Administradora', email: 'carla@exemplo.com', perfil: 'admin', ativo: true, criado_em: '2026-01-01T00:00:00Z' }),
      )
      await page.route(/\/alerts(\?|$)/, (rota) => json(rota, dadosDosAlertas().filter((a) => !a.resolvido_em)))
      await page.route('**/dashboard', (rota) =>
        json(rota, { total_produtos: 0, produtos_estoque_baixo: 0, produtos_sem_estoque: 0, lotes_a_vencer: 0, lotes_vencidos: 0, alertas_ativos: 0, ultimas_movimentacoes: [] }),
      )
    }

    // Painel
    await page.getByLabel('E-mail').fill(email ?? 'carla@exemplo.com')
    await page.getByLabel('Senha', { exact: true }).fill(senha ?? 'simulada')
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.getByRole('heading', { name: 'Painel' }).waitFor()
    // Espera a resposta de /dashboard aparecer (networkidle passa antes do fetch)
    await page.getByText(/Últimas movimentações|Cadastre seu primeiro produto/).first().waitFor()
    await capturar(page, `${rotulo}-painel`, largura)
    if (!email || !senha) await page.unroute('**/dashboard')

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

    // Página não encontrada (endereço que não existe)
    await page.goto(`${site}/endereco-inexistente`)
    await page.getByRole('heading', { name: 'Página não encontrada' }).waitFor()
    await capturar(page, `${rotulo}-nao-encontrada`, largura, { verificarPagina: false })

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
    await capturarEstoque(rotulo, largura)
    await capturarAlertasEUsuarios(rotulo, largura)
  }
} finally {
  await navegador.close()
}

writeFileSync(join(saida, 'relatorio.json'), JSON.stringify(relatorio, null, 2))
console.log(`Capturas em ${saida}`)
console.log(JSON.stringify(relatorio, null, 2))
