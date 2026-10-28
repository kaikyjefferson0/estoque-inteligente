// Teste de ponta a ponta contra a API real (npm run test:e2e, dentro de frontend).
//
// 1. Gera as senhas do admin e do operador na hora (só em memória, passadas por variável de ambiente).
// 2. Recria o banco estoque_e2e pelas migrations e cria os dois usuários (backend\tests\e2e_preparar.py).
// 3. Sobe a API na porta 8001 (usuário da aplicação, CORS para a 5175) e o site na porta 5175.
// 4. Roda o Playwright (e2e\*.spec.ts) e, no fim, para a API e o site, mesmo se algo falhar.
import { spawn, spawnSync } from 'node:child_process'
import { createConnection } from 'node:net'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONTEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BACKEND = path.resolve(FRONTEND, '..', 'backend')
const WINDOWS = process.platform === 'win32'
const PYTHON = path.join(BACKEND, '.venv', WINDOWS ? 'Scripts' : 'bin', WINDOWS ? 'python.exe' : 'python')
const PORTA_API = 8001
const PORTA_SITE = 5175
const API = `http://127.0.0.1:${PORTA_API}`
// "localhost", não 127.0.0.1: é a origem liberada no CORS da API (tests\e2e_ambiente.py)
const SITE = `http://localhost:${PORTA_SITE}`
const ESPERA_MAXIMA_MS = 60_000
const RESULTADOS = path.join(FRONTEND, 'test-results', 'e2e')

// Executáveis chamados direto pelo node, sem o npx: o processo parado é o próprio servidor
const VITE = path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js')
const PLAYWRIGHT = path.join(FRONTEND, 'node_modules', '@playwright', 'test', 'cli.js')

const processos = []

function log(texto) {
  console.log(`[e2e] ${texto}`)
}

/** Senha forte, sem caracteres que atrapalhem a digitação no navegador. */
function senhaAleatoria() {
  return randomBytes(18).toString('base64url')
}

/** Sobe um processo e guarda as últimas linhas da saída, para mostrar se ele cair. */
function subir(nome, comando, args, opcoes) {
  const processo = spawn(comando, args, { ...opcoes, stdio: ['ignore', 'pipe', 'pipe'] })
  const saida = []
  const guardar = (pedaco) => {
    saida.push(...pedaco.toString().split(/\r?\n/).filter(Boolean))
    saida.splice(0, Math.max(saida.length - 40, 0))
  }
  processo.stdout.on('data', guardar)
  processo.stderr.on('data', guardar)
  processo.encerrado = false
  processo.on('exit', () => {
    processo.encerrado = true
  })
  processo.nome = nome
  processo.saida = saida
  processos.push(processo)
  return processo
}

/** Para o processo e todos os filhos dele (no Windows, o taskkill /T leva a árvore inteira). */
function parar(processo) {
  if (processo.encerrado || processo.pid === undefined) return
  if (WINDOWS) spawnSync('taskkill', ['/pid', String(processo.pid), '/T', '/F'], { stdio: 'ignore' })
  else processo.kill('SIGTERM')
  log(`${processo.nome} parado.`)
}

function pararTudo() {
  for (const processo of processos.splice(0)) parar(processo)
}

async function esperar(processo, url) {
  const limite = Date.now() + ESPERA_MAXIMA_MS
  while (Date.now() < limite) {
    if (processo.encerrado) break
    try {
      const resposta = await fetch(url)
      if (resposta.ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  console.error(processo.saida.join('\n'))
  throw new Error(`${processo.nome} não respondeu em ${url}.`)
}

/** true se algo já atende na porta (ex.: servidor órfão de uma rodada interrompida). */
function portaOcupada(porta) {
  return new Promise((resolver) => {
    const conexao = createConnection({ host: 'localhost', port: porta })
    conexao.once('connect', () => {
      conexao.destroy()
      resolver(true)
    })
    conexao.once('error', () => resolver(false))
  })
}

async function principal() {
  if (!existsSync(PYTHON)) throw new Error(`Python do backend não encontrado em ${PYTHON}. Crie o backend\\.venv antes.`)

  const segredos = {
    E2E_SENHA_ADMIN: senhaAleatoria(),
    E2E_SENHA_OPERADOR: senhaAleatoria(),
    // Usadas só pelo Playwright: a nova senha do operador (RN-48) e a do usuário cadastrado na tela
    E2E_SENHA_NOVA_OPERADOR: senhaAleatoria(),
    E2E_SENHA_USUARIO: senhaAleatoria(),
  }
  // Os servidores não recebem as senhas; só a preparação do banco e o Playwright
  const ambienteBase = { ...process.env }
  for (const nome of Object.keys(segredos)) delete ambienteBase[nome]

  // Um servidor esquecido de outra rodada responderia no lugar do novo, com outro estado em memória
  for (const porta of [PORTA_API, PORTA_SITE]) {
    if (await portaOcupada(porta)) {
      throw new Error(`A porta ${porta} já está em uso. Pare o processo que a ocupa (netstat -ano | findstr :${porta}) e rode de novo.`)
    }
  }

  log('Recriando o banco estoque_e2e pelas migrations…')
  const preparo = spawnSync(PYTHON, ['-m', 'tests.e2e_preparar'], {
    cwd: BACKEND,
    env: { ...ambienteBase, ...segredos },
    stdio: 'inherit',
  })
  if (preparo.status !== 0) throw new Error('A preparação do banco falhou.')

  log(`Subindo a API em ${API} e o site em ${SITE}…`)
  const api = subir('API', PYTHON, ['-m', 'tests.e2e_api'], { cwd: BACKEND, env: ambienteBase })
  const site = subir('Site', process.execPath, [VITE, '--port', String(PORTA_SITE), '--strictPort'], {
    cwd: FRONTEND,
    // Variável já definida vale mais que o frontend\.env no Vite
    env: { ...ambienteBase, VITE_API_URL: API },
  })
  await Promise.all([esperar(api, `${API}/health`), esperar(site, SITE)])
  // Quem respondeu precisa ser o processo que acabou de subir
  for (const processo of [api, site]) {
    if (processo.encerrado) {
      console.error(processo.saida.join('\n'))
      throw new Error(`${processo.nome} encerrou logo depois de subir.`)
    }
  }

  log('Rodando os cenários no Playwright…')
  const testes = spawnSync(process.execPath, [PLAYWRIGHT, 'test', '-c', path.join('e2e', 'playwright.config.ts')], {
    cwd: FRONTEND,
    env: { ...ambienteBase, ...segredos, E2E_SITE: SITE },
    stdio: 'inherit',
  })
  // Numa falha, o Playwright grava o retrato da página (error-context.md); as senhas não podem ficar lá
  apagarSegredos(RESULTADOS, Object.values(segredos))
  return testes.status ?? 1
}

/** Troca as senhas por *** em qualquer arquivo de texto que o Playwright tenha deixado. */
function apagarSegredos(pasta, valores) {
  if (!existsSync(pasta)) return
  for (const entrada of readdirSync(pasta, { withFileTypes: true, recursive: true })) {
    if (!entrada.isFile() || !/\.(md|txt|json|html)$/.test(entrada.name)) continue
    const arquivo = path.join(entrada.parentPath, entrada.name)
    const texto = readFileSync(arquivo, 'utf8')
    const limpo = valores.reduce((atual, valor) => atual.replaceAll(valor, '***'), texto)
    if (limpo !== texto) writeFileSync(arquivo, limpo)
  }
}

for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    pararTudo()
    process.exit(130)
  })
}

let codigo = 1
try {
  codigo = await principal()
} catch (erro) {
  console.error(`[e2e] ${erro.message}`)
} finally {
  pararTudo()
}
process.exit(codigo)
