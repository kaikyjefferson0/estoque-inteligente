import { expect, test, type Browser, type Page } from '@playwright/test'

// Contra a API real e o banco estoque_e2e recriado pelo e2e\rodar.mjs.
// As senhas chegam por variável de ambiente, geradas na hora; nada vai para arquivo.
const ADMIN = { email: 'admin.e2e@exemplo.com.br', senha: lerSenha('E2E_SENHA_ADMIN') }
const OPERADOR = { email: 'operador.e2e@exemplo.com.br', senha: lerSenha('E2E_SENHA_OPERADOR') }
const NOVA_SENHA_OPERADOR = lerSenha('E2E_SENHA_NOVA_OPERADOR')
const SENHA_USUARIO_NOVO = lerSenha('E2E_SENHA_USUARIO')
const API = 'http://127.0.0.1:8001'

const FORNECEDOR = { nome: 'Distribuidora Ponta a Ponta', cnpj: '11222333000181' }
// Iogurte controla validade (alerta 10 dias antes); sabão não controla e tem mínimo 10
const IOGURTE = { nome: 'Iogurte natural E2E', codigo: '7890000000011', minimo: '5', dias: '10' }
const SABAO = { nome: 'Sabão em barra E2E', codigo: '7890000000028', minimo: '10' }

// Validades contadas a partir do "hoje" de Brasília (RN-31, RN-36)
const VENCE_LOGO = diaDeBrasilia(5)
const VENCE_DEPOIS = diaDeBrasilia(60)

function lerSenha(variavel: string): string {
  const senha = process.env[variavel]
  if (!senha) throw new Error(`${variavel} ausente: rode pelo npm run test:e2e.`)
  return senha
}

/** Daqui a `dias` dias, no fuso de Brasília, como dd/mm/aaaa. */
function diaDeBrasilia(dias: number): string {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const data = new Date(`${hoje}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  const [ano, mes, dia] = data.toISOString().slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

async function entrar(page: Page, email: string, senha: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Painel', level: 1 })).toBeVisible()
}

async function novaPagina(browser: Browser): Promise<Page> {
  const contexto = await browser.newContext()
  return contexto.newPage()
}

async function registrarEntrada(page: Page, codigo: string, quantidade: string, validade?: string) {
  await page.goto('/entrada')
  await page.getByLabel('Código de barras').fill(codigo)
  await page.getByLabel('Código de barras').press('Enter')
  await page.getByLabel('Quantidade').fill(quantidade)
  if (validade) await page.getByLabel('Validade').fill(validade)
  await page.getByRole('button', { name: 'Registrar entrada' }).click()
  await expect(page.getByText('Entrada registrada.')).toBeVisible()
}

function itemDoAlerta(page: Page, produto: string) {
  return page.locator('.alertas > li').filter({ hasText: produto })
}

/** Chamada direta à API com o token da sessão: a permissão real é do backend. */
async function statusNaApi(page: Page, caminho: string, metodo = 'GET', corpo?: unknown): Promise<number> {
  return page.evaluate(
    async ({ url, metodo, corpo }) => {
      const token = sessionStorage.getItem('estoque.token')
      const resposta = await fetch(url, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      })
      return resposta.status
    },
    { url: `${API}${caminho}`, metodo, corpo },
  )
}

test.describe.configure({ mode: 'serial' })

let admin: Page

test.beforeAll(async ({ browser }) => {
  admin = await novaPagina(browser)
})

test.afterAll(async () => {
  await admin.context().close()
})

test('login do admin', async () => {
  await entrar(admin, ADMIN.email, ADMIN.senha)
  const menu = admin.getByRole('navigation', { name: 'Menu principal' })
  await expect(menu.getByRole('link', { name: 'Usuários' })).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Ajustes' })).toBeVisible()
})

test('cadastro de fornecedor e de dois produtos (com e sem validade)', async () => {
  await admin.goto('/fornecedores/novo')
  await admin.getByLabel('Nome').fill(FORNECEDOR.nome)
  await admin.getByLabel('CNPJ (opcional)').fill(FORNECEDOR.cnpj)
  await admin.getByRole('button', { name: 'Cadastrar fornecedor' }).click()
  await expect(admin.getByText('Fornecedor cadastrado', { exact: true })).toBeVisible()
  await expect(admin.getByRole('cell', { name: '11.222.333/0001-81' })).toBeVisible()

  // Com validade e com o fornecedor escolhido pela busca no próprio campo (RN-51)
  await admin.goto('/produtos/novo')
  await admin.getByLabel('Nome').fill(IOGURTE.nome)
  await admin.getByLabel('Código de barras').fill(IOGURTE.codigo)
  await admin.getByLabel('Estoque mínimo').fill(IOGURTE.minimo)
  await admin.getByRole('combobox', { name: 'Fornecedor (opcional)' }).fill('ponta')
  await admin.getByRole('option', { name: new RegExp(FORNECEDOR.nome) }).click()
  await admin.getByLabel('Controla validade').check()
  await admin.getByLabel('Dias de alerta').fill(IOGURTE.dias)
  await admin.getByRole('button', { name: 'Cadastrar produto' }).click()
  await expect(admin.getByRole('heading', { name: IOGURTE.nome })).toBeVisible()
  await expect(admin.getByText(FORNECEDOR.nome)).toBeVisible()

  // Sem validade e sem fornecedor
  await admin.goto('/produtos/novo')
  await admin.getByLabel('Nome').fill(SABAO.nome)
  await admin.getByLabel('Código de barras').fill(SABAO.codigo)
  await admin.getByLabel('Estoque mínimo').fill(SABAO.minimo)
  await admin.getByRole('button', { name: 'Cadastrar produto' }).click()
  await expect(admin.getByRole('heading', { name: SABAO.nome })).toBeVisible()

  await admin.goto('/produtos')
  await expect(admin.getByRole('link', { name: IOGURTE.nome })).toBeVisible()
  await expect(admin.getByRole('link', { name: SABAO.nome })).toBeVisible()
  await expect(admin.getByRole('navigation', { name: 'Páginas de produtos' })).toContainText('1 a 2 de 2')
})

test('entrada pelo código de barras', async () => {
  // Dois lotes do iogurte (RN-28) e um lote único do sabão (RN-27)
  await registrarEntrada(admin, IOGURTE.codigo, '4', VENCE_LOGO)
  await registrarEntrada(admin, IOGURTE.codigo, '10', VENCE_DEPOIS)
  await registrarEntrada(admin, SABAO.codigo, '7')

  await admin.goto(`/estoque?busca=${encodeURIComponent('E2E')}`)
  const iogurte = admin.getByRole('row').filter({ hasText: IOGURTE.nome })
  await expect(iogurte).toContainText('14')
  // RN-13: 7 no sabão, com mínimo 10, é estoque baixo
  await expect(admin.getByRole('row').filter({ hasText: SABAO.nome })).toContainText('Estoque baixo')
})

test('saída usando FEFO em dois lotes', async () => {
  // RN-14: o lote que vence em 5 dias está dentro dos 10 dias de alerta
  await admin.goto('/alertas')
  await expect(itemDoAlerta(admin, IOGURTE.nome)).toContainText('Vencimento próximo')

  await admin.goto('/saida')
  await admin.getByLabel('Código de barras').fill(IOGURTE.codigo)
  await admin.getByLabel('Código de barras').press('Enter')
  await admin.getByLabel('Quantidade').fill('6')
  await admin.getByRole('button', { name: 'Registrar saída' }).click()

  // RN-10: sai primeiro do lote que vence antes; zera e completa com o seguinte
  await expect(admin.getByText('Saída registrada.')).toBeVisible()
  const lotes = admin.locator('.saida__lote')
  await expect(lotes).toHaveCount(2)
  await expect(lotes.nth(0)).toContainText(`Validade ${VENCE_LOGO}`)
  await expect(lotes.nth(0)).toContainText('lote zerado')
  await expect(lotes.nth(1)).toContainText(`Validade ${VENCE_DEPOIS}`)
  await expect(lotes.nth(1)).toContainText('ficaram 8')
})

test('ajuste com confirmação', async () => {
  await admin.goto('/ajustes')
  await admin.getByRole('combobox', { name: 'Produto' }).fill('iogurte')
  await admin.getByRole('option', { name: new RegExp(IOGURTE.nome) }).click()
  // RN-37: o lote zerado não aparece; só o que vence depois, com 8
  await admin.getByRole('radio', { name: new RegExp(`Validade ${VENCE_DEPOIS}`) }).check()
  await admin.getByLabel('Saldo contado').fill('7')
  await admin.getByLabel('Motivo').fill('Contagem do inventário E2E')
  await admin.getByRole('button', { name: 'Revisar ajuste' }).click()

  const dialogo = admin.getByRole('alertdialog', { name: 'Registrar este ajuste?' })
  await expect(dialogo).toBeVisible()
  await dialogo.getByRole('button', { name: 'Registrar ajuste' }).click()

  // RN-33: o sistema calcula a diferença (8 contados como 7 = −1)
  const aviso = admin.locator('.aviso').filter({ hasText: 'Ajuste registrado.' })
  await expect(aviso).toContainText(`Validade ${VENCE_DEPOIS}`.toLowerCase())
  await expect(aviso).toContainText('(−1)')
})

test('alerta aparecendo e "Verificar agora"', async () => {
  await admin.goto('/alertas')
  // RN-13: sabão abaixo do mínimo
  await expect(itemDoAlerta(admin, SABAO.nome)).toContainText('Estoque baixo')
  // RN-42: o lote que vencia logo zerou na saída, e o alerta dele foi resolvido
  await expect(itemDoAlerta(admin, IOGURTE.nome)).toHaveCount(0)
  await expect(admin.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: /Alertas/ })).toContainText('1')

  await admin.getByRole('button', { name: 'Verificar agora' }).click()
  await expect(admin.getByText('Verificação concluída.')).toBeVisible()
  await expect(itemDoAlerta(admin, SABAO.nome)).toContainText('Estoque baixo')
})

test.describe('operador', () => {
  let operador: Page

  test.beforeAll(async ({ browser }) => {
    operador = await novaPagina(browser)
  })

  test.afterAll(async () => {
    await operador.context().close()
  })

  test('operador sem acesso a Usuários e Ajustes', async () => {
    await entrar(operador, OPERADOR.email, OPERADOR.senha)
    const menu = operador.getByRole('navigation', { name: 'Menu principal' })
    await expect(menu.getByRole('link', { name: 'Estoque' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Usuários' })).toHaveCount(0)
    await expect(menu.getByRole('link', { name: 'Ajustes' })).toHaveCount(0)

    // Pelo endereço, a tela manda de volta ao painel
    for (const rota of ['/usuarios', '/ajustes']) {
      await operador.goto(rota)
      await expect(operador.getByRole('heading', { name: 'Painel', level: 1 })).toBeVisible()
    }

    // RN-02: quem barra de verdade é a API
    expect(await statusNaApi(operador, '/users')).toBe(403)
    expect(await statusNaApi(operador, '/stock/adjustments', 'POST', { lote_id: 1, saldo_contado: 0, motivo: 'x' })).toBe(403)
  })

  test('troca da própria senha', async () => {
    const novaSenha = NOVA_SENHA_OPERADOR
    await operador.goto('/minha-conta')
    await operador.getByLabel('Senha atual').fill(OPERADOR.senha)
    await operador.getByLabel('Nova senha', { exact: true }).fill(novaSenha)
    await operador.getByLabel('Confirme a nova senha').fill(novaSenha)
    await operador.getByRole('button', { name: 'Trocar senha' }).click()

    // RN-48: o token antigo deixa de valer e a pessoa entra de novo com a nova senha
    await expect(operador).toHaveURL(/\/login$/)
    await expect(operador.getByText('Senha trocada. Entre com a nova senha.')).toBeVisible()
    await entrar(operador, OPERADOR.email, novaSenha)
  })
})

test('cadastro de usuário com e-mail repetido', async () => {
  const senha = SENHA_USUARIO_NOVO
  async function preencher(nome: string, email: string) {
    await admin.goto('/usuarios/novo')
    await admin.getByLabel('Nome').fill(nome)
    await admin.getByLabel('E-mail').fill(email)
    await admin.getByLabel('Senha', { exact: true }).fill(senha)
    await admin.getByLabel('Confirme a senha').fill(senha)
    await admin.getByRole('button', { name: 'Cadastrar usuário' }).click()
  }

  await preencher('Pessoa Nova E2E', 'pessoa.nova.e2e@exemplo.com.br')
  await expect(admin.getByText('Usuário cadastrado', { exact: true })).toBeVisible()
  // Na largura de computador, a lista é a tabela (no celular, os blocos)
  await expect(admin.getByRole('table').getByText('pessoa.nova.e2e@exemplo.com.br')).toBeVisible()

  // O e-mail do operador já existe (com outra caixa, que a API normaliza)
  await preencher('Outra Pessoa E2E', 'Operador.E2E@Exemplo.com.br')
  await expect(admin.getByText('Este e-mail já está cadastrado. Use outro e-mail.').first()).toBeVisible()
  await expect(admin).toHaveURL(/\/usuarios\/novo$/)
})
