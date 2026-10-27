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
        if (estilo.display === 'none' || el.closest('.visualmente-oculto, svg')) continue
        for (const p of props) {
          const v = estilo[p]
          if (!v || v === 'normal' || v === 'auto') continue
          const n = Math.abs(parseFloat(v))
          if (!Number.isNaN(n) && !escala.includes(Math.round(n))) fora.push(`${descrever(el)} ${p}=${v}`)
        }
        if (largura <= 900 && el.matches('a, button, input, [role="menuitem"]')) {
          const r = el.getBoundingClientRect()
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
    await page.goto(`${site}/produtos`)
    await page.getByRole('heading', { name: 'Produtos' }).waitFor()
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
} finally {
  await navegador.close()
}

writeFileSync(join(saida, 'relatorio.json'), JSON.stringify(relatorio, null, 2))
console.log(`Capturas em ${saida}`)
console.log(JSON.stringify(relatorio, null, 2))
