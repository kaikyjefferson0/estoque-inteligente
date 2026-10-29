// Capturas para o README (galeria pública do projeto).
// Sobe NADA: espera a API e o site já no ar. Entra com uma conta real (de exemplo).
// Uso, dentro de frontend:
//   README_EMAIL=... README_SENHA=... node scripts\capturas-readme.mjs <pasta-de-saida> [site]
// As credenciais vêm só do ambiente (nunca gravadas em arquivo). As telas usam os dados
// de demonstração (nomes e e-mails de exemplo), sem nenhum dado pessoal real.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const saida = process.argv[2]
const site = (process.argv[3] ?? 'http://localhost:5173').replace(/\/+$/, '')
const email = process.env.README_EMAIL
const senha = process.env.README_SENHA

if (!saida || !email || !senha) {
  console.error('Uso: README_EMAIL=... README_SENHA=... node scripts\\capturas-readme.mjs <pasta> [site]')
  process.exit(1)
}
mkdirSync(saida, { recursive: true })

const navegador = await chromium.launch()

// Converte o PNG do Playwright em WebP leve usando o próprio Chromium (canvas → image/webp),
// sem depender de nenhuma biblioteca de imagem instalada.
const conversor = await navegador.newPage()
async function salvarWebp(pngBuffer, destino) {
  const b64 = await conversor.evaluate(async (dataUrl) => {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext('2d').drawImage(img, 0, 0)
    return c.toDataURL('image/webp', 0.85).split(',')[1]
  }, `data:image/png;base64,${pngBuffer.toString('base64')}`)
  writeFileSync(destino, Buffer.from(b64, 'base64'))
}

async function entrar(largura) {
  const contexto = await navegador.newContext({
    viewport: { width: largura, height: largura < 900 ? 812 : 900 },
    reducedMotion: 'reduce',
  })
  const page = await contexto.newPage()
  await page.goto(`${site}/login`)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('heading', { name: 'Painel', level: 1 }).waitFor()
  return { contexto, page }
}

async function capturar(page, nome) {
  const arquivo = join(saida, `${nome}.webp`)
  const png = await page.screenshot({ fullPage: true })
  await salvarWebp(png, arquivo)
  console.log('capturada:', arquivo)
}

async function painel(page) {
  await page.goto(`${site}/`)
  await page.getByRole('heading', { name: 'Painel', level: 1 }).waitFor()
  // Espera os cartões do painel carregarem (sai do estado "carregando")
  await page.waitForLoadState('networkidle')
}

async function alertas(page) {
  await page.goto(`${site}/alertas`)
  await page.locator('.alerta').first().waitFor()
}

// ---- 1280 px (computador): as seis telas ----
{
  const { contexto, page } = await entrar(1280)

  await painel(page)
  await capturar(page, 'painel')

  await page.goto(`${site}/estoque`)
  await page.getByRole('table').waitFor()
  await page.waitForLoadState('networkidle')
  await capturar(page, 'estoque')

  // Detalhe do produto com lotes e histórico: o leite tem 2 lotes (a vencer e em dia) e movimentações
  await page.goto(`${site}/produtos/1`)
  await page.locator('.historico__item').first().waitFor()
  await capturar(page, 'produto-detalhe')

  // Entrada pelo código de barras: lê o código e mostra o produto e o formulário
  await page.goto(`${site}/entrada`)
  await page.getByRole('heading', { name: 'Entrada', level: 1 }).waitFor()
  await page.keyboard.type('7896000000011')
  await page.keyboard.press('Enter')
  await page.getByLabel('Quantidade').waitFor()
  await page.getByLabel('Quantidade').fill('30')
  await capturar(page, 'entrada')

  await alertas(page)
  await capturar(page, 'alertas')

  await page.goto(`${site}/usuarios`)
  await page.getByRole('table').waitFor()
  await capturar(page, 'usuarios')

  await contexto.close()
}

// ---- 390 px (celular): painel e alertas ----
{
  const { contexto, page } = await entrar(390)
  await painel(page)
  await capturar(page, 'painel-celular')
  await alertas(page)
  await capturar(page, 'alertas-celular')
  await contexto.close()
}

await navegador.close()
console.log('Fim das capturas.')
