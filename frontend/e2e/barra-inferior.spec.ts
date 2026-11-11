import { expect, test, type Page } from '@playwright/test'

// Barra inferior do celular e do tablet (até 900px), contra a API real com os dados de exemplo da
// demo (e2e_preparar.py --demo), que têm alertas ativos para a contagem. O e2e\rodar.mjs roda este
// arquivo depois do estoque.spec.ts, com o banco recriado.

const ADMIN = { email: 'admin.e2e@exemplo.com.br', senha: lerSenha('E2E_SENHA_ADMIN') }

function lerSenha(variavel: string): string {
  const senha = process.env[variavel]
  if (!senha) throw new Error(`${variavel} ausente: rode pelo npm run test:e2e.`)
  return senha
}

async function entrar(page: Page) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(ADMIN.email)
  await page.getByLabel('Senha', { exact: true }).fill(ADMIN.senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel', level: 1 })).toBeVisible()
}

function barra(page: Page) {
  return page.getByRole('navigation', { name: 'Atalhos' })
}

test.describe.configure({ mode: 'serial' })

let page: Page

test.beforeAll(async ({ browser }) => {
  // Um login só: o limite de login (RN-47) é de 10 por minuto por IP
  const contexto = await browser.newContext({ viewport: { width: 375, height: 740 } })
  page = await contexto.newPage()
  await entrar(page)
})

test.afterAll(async () => {
  await page.context().close()
})

test('no celular, a barra substitui o botão de menu do topo', async () => {
  await page.setViewportSize({ width: 375, height: 740 })
  await page.goto('/')
  await expect(barra(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toHaveCount(0)
  await expect(barra(page).getByRole('link', { name: 'Painel' })).toHaveAttribute('aria-current', 'page')
})

test('navega por Entrada, Saída e Alertas, com a página atual marcada', async () => {
  await page.goto('/')
  for (const [nome, caminho, titulo] of [
    [/^Entrada$/, '/entrada', 'Entrada'],
    [/^Saída$/, '/saida', 'Saída'],
    // A contagem do menu entra no nome: "Alertas, 8 ativos"
    [/^Alertas, \d+ ativos?$/, '/alertas', 'Alertas'],
    [/^Painel$/, '/', 'Painel'],
  ] as const) {
    const link = barra(page).getByRole('link', { name: nome })
    await link.click()
    await expect(page).toHaveURL(new RegExp(`${caminho}$`))
    await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible()
    await expect(link).toHaveAttribute('aria-current', 'page')
    await expect(barra(page).locator('[aria-current="page"]')).toHaveCount(1)
  }
})

test('"Mais" abre a gaveta, que leva às outras páginas e fecha ao navegar', async () => {
  await page.goto('/')
  const mais = barra(page).getByRole('button', { name: /^Mais/ })
  await mais.click()
  const gaveta = page.getByRole('dialog', { name: 'Menu' })
  await expect(gaveta).toBeVisible()
  // Com a gaveta aberta, o resto da tela fica fora da árvore de acessibilidade (aria-hidden do
  // Radix), por isso o "Mais" é lido pelo seletor e não pelo papel
  await expect(page.locator('nav[aria-label="Atalhos"] button')).toHaveAttribute('aria-expanded', 'true')

  await gaveta.getByRole('link', { name: 'Estoque' }).click()
  await expect(gaveta).toBeHidden()
  await expect(page).toHaveURL(/\/estoque$/)
  // Fora das quatro páginas da barra, o "Mais" diz onde a pessoa está
  await expect(barra(page).getByRole('button', { name: 'Mais, você está em Estoque' })).toBeVisible()
  await expect(barra(page).locator('[aria-current="page"]')).toHaveCount(0)
})

test('Esc fecha a gaveta e devolve o foco ao "Mais"', async () => {
  await page.goto('/')
  const mais = barra(page).getByRole('button', { name: /^Mais/ })
  await mais.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden()
  await expect(mais).toBeFocused()
})

test('a barra não cobre o fim da página nem um controle focado, em 320px', async () => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/produtos/novo')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const medidas = await page.evaluate(async () => {
    const topoDaBarra = () => document.querySelector('nav[aria-label="Atalhos"]')!.getBoundingClientRect().top
    // O último controle do formulário recebe o foco a partir do topo da página
    window.scrollTo(0, 0)
    const controles = [...document.querySelectorAll<HTMLElement>('main button, main input, main a')].filter((el) =>
      el.checkVisibility(),
    )
    const ultimo = controles.at(-1)!
    ultimo.focus()
    await new Promise((r) => setTimeout(r, 300))
    const focado = ultimo.getBoundingClientRect().bottom
    // E o fim do conteúdo com a página rolada até o fim
    window.scrollTo(0, document.documentElement.scrollHeight)
    await new Promise((r) => setTimeout(r, 300))
    const fim = document.querySelector('main')!.lastElementChild!.getBoundingClientRect().bottom
    return {
      focado,
      fim,
      topo: topoDaBarra(),
      larguraDaPagina: document.documentElement.scrollWidth,
      larguraDaBarra: document.querySelector('nav[aria-label="Atalhos"]')!.getBoundingClientRect().width,
    }
  })
  expect(medidas.focado).toBeLessThanOrEqual(medidas.topo)
  expect(medidas.fim).toBeLessThanOrEqual(medidas.topo)
  // 5 itens em 320px, com o respiro e os espaços entre eles: sem rolagem lateral
  expect(medidas.larguraDaPagina).toBe(320)
  expect(medidas.larguraDaBarra).toBe(320)
})

test('no computador, a barra some e fica o menu lateral', async () => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(barra(page)).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Menu principal' })).toBeVisible()
})
