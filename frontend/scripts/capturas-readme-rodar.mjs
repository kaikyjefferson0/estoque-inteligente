// Capturas do README, de ponta a ponta (npm run capturas:readme, dentro de frontend).
//
// Faz tudo sozinho e não grava nenhum segredo:
// 1. Gera as senhas do admin e da conta de demonstração na hora (só em memória, por variável
//    de ambiente). As URLs do banco ficam no backend\.env e são lidas pelo lado Python
//    (tests.e2e_ambiente), nunca por este script nem impressas.
// 2. Recria o banco estoque_e2e pelas migrations, com as contas de exemplo
//    (admin@exemplo.com e demo@exemplo.com) e os dados de demonstração (tests.capturas_preparar).
// 3. Sobe a API na porta 8001 (usuário da aplicação, CORS para a 5175) e o site na porta 5175.
// 4. Gera as capturas em docs\imagens\ (scripts\capturas-readme.mjs), entrando como admin.
// 5. No fim, para a API e o site, mesmo se algo falhar.
import { spawn, spawnSync } from 'node:child_process'
import { createConnection } from 'node:net'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
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
const SAIDA = path.resolve(FRONTEND, '..', 'docs', 'imagens')
const ESPERA_MAXIMA_MS = 60_000
const EMAIL_ADMIN = 'admin@exemplo.com'

const VITE = path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js')
const CAPTURAS = path.join(FRONTEND, 'scripts', 'capturas-readme.mjs')

const processos = []

function log(texto) {
  console.log(`[capturas] ${texto}`)
}

function senhaAleatoria() {
  return randomBytes(18).toString('base64url')
}

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

/** Para o processo e todos os filhos (no Windows, o taskkill /T leva a árvore inteira). */
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
    CAPTURAS_SENHA_ADMIN: senhaAleatoria(),
    CAPTURAS_SENHA_DEMO: senhaAleatoria(),
  }
  // Os servidores não recebem as senhas; só a preparação do banco e as capturas (login do admin)
  const ambienteBase = { ...process.env }
  for (const nome of Object.keys(segredos)) delete ambienteBase[nome]

  for (const porta of [PORTA_API, PORTA_SITE]) {
    if (await portaOcupada(porta)) {
      throw new Error(`A porta ${porta} já está em uso. Pare o processo que a ocupa (netstat -ano | findstr :${porta}) e rode de novo.`)
    }
  }

  log('Recriando o banco estoque_e2e pelas migrations, com as contas de exemplo e os dados de demonstração…')
  const preparo = spawnSync(PYTHON, ['-m', 'tests.capturas_preparar'], {
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
  for (const processo of [api, site]) {
    if (processo.encerrado) {
      console.error(processo.saida.join('\n'))
      throw new Error(`${processo.nome} encerrou logo depois de subir.`)
    }
  }

  log(`Gerando as capturas em ${SAIDA}…`)
  const capturas = spawnSync(process.execPath, [CAPTURAS, SAIDA, SITE], {
    cwd: FRONTEND,
    env: { ...ambienteBase, README_EMAIL: EMAIL_ADMIN, README_SENHA: segredos.CAPTURAS_SENHA_ADMIN },
    stdio: 'inherit',
  })
  if (capturas.status !== 0) throw new Error('A geração das capturas falhou.')
  return 0
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
  if (codigo === 0) log('Pronto: capturas geradas em docs\\imagens e servidores parados.')
} catch (erro) {
  console.error(`[capturas] ${erro.message}`)
} finally {
  pararTudo()
}
process.exit(codigo)
