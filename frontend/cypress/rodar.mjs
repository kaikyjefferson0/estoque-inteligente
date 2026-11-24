// Teste de ponta a ponta com Cypress contra a API real (dentro de frontend):
//   npm run cy:e2e    roda a suíte no terminal
//   npm run cy:open   abre a interface gráfica do Cypress
//
// 1. Gera as senhas do admin e do operador na hora (só em memória, passadas por variável de ambiente).
// 2. Recria o banco estoque_e2e pelas migrations (backend\tests\e2e_preparar.py).
// 3. Sobe a API na porta 8001, com E2E_RESET=true (a rota de reset, RN-67), e o site na 5175.
// 4. Roda o Cypress. Cada teste chama o reset antes de começar.
// No fim (ou ao fechar a janela do Cypress), para a API e o site, mesmo se algo falhar.
import { spawn, spawnSync } from 'node:child_process'
import { createConnection } from 'node:net'
import { randomBytes } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'
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
const ABRIR = process.argv.includes('--abrir')

// Executáveis chamados direto pelo node, sem o npx: o processo parado é o próprio servidor
const VITE = path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js')
const CYPRESS = path.join(FRONTEND, 'node_modules', 'cypress', 'bin', 'cypress')

const segredos = {
  E2E_SENHA_ADMIN: randomBytes(18).toString('base64url'),
  E2E_SENHA_OPERADOR: randomBytes(18).toString('base64url'),
}
// Chave só desta rodada: um token do teste (os ids recomeçam do 1) não vale na API de desenvolvimento
const chaves = { SECRET_KEY: randomBytes(32).toString('hex') }
const processos = []

function log(texto) {
  console.log(`[cypress] ${texto}`)
}

/** Nenhuma senha chega ao terminal (nem ao log do CI), mesmo numa mensagem de erro. */
function semSenhas(texto) {
  return Object.values({ ...segredos, ...chaves }).reduce((atual, senha) => atual.replaceAll(senha, '***'), texto)
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
  processo.on('error', (erro) => {
    processo.encerrado = true
    guardar(erro.message)
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

function falhar(processo, motivo) {
  console.error(semSenhas(processo.saida.join('\n')))
  throw new Error(`${processo.nome} ${motivo}`)
}

async function esperar(processo, url) {
  const limite = Date.now() + ESPERA_MAXIMA_MS
  while (Date.now() < limite && !processo.encerrado) {
    try {
      const resposta = await fetch(url)
      if (resposta.ok) return
    } catch {
      // ainda subindo
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  falhar(processo, `não respondeu em ${url}.`)
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

/** Roda o Cypress até o fim e devolve o código de saída. */
function rodarCypress(ambiente) {
  return new Promise((resolver, rejeitar) => {
    const env = { ...ambiente, E2E_SITE: SITE, E2E_API: API, E2E_SENHA_ADMIN: segredos.E2E_SENHA_ADMIN }
    // Definida no terminal de alguns editores, faz o Cypress abrir como se fosse o Node
    delete env.ELECTRON_RUN_AS_NODE
    const processo = spawn(process.execPath, [CYPRESS, ABRIR ? 'open' : 'run', '--e2e'], {
      cwd: FRONTEND,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    processo.nome = 'Cypress'
    processo.encerrado = false
    processos.push(processo)
    for (const [origem, destino] of [
      [processo.stdout, process.stdout],
      [processo.stderr, process.stderr],
    ]) {
      // Linha a linha: uma senha cortada entre dois pedaços escaparia da troca
      let resto = ''
      origem.setEncoding('utf8')
      origem.on('data', (pedaco) => {
        const linhas = (resto + pedaco).split('\n')
        resto = linhas.pop()
        for (const linha of linhas) destino.write(`${semSenhas(linha)}\n`)
      })
      origem.on('end', () => resto && destino.write(semSenhas(resto)))
    }
    processo.on('error', rejeitar)
    processo.on('close', (codigo) => {
      processo.encerrado = true
      resolver(codigo ?? 1)
    })
  })
}

async function principal() {
  if (!existsSync(PYTHON)) throw new Error(`Python do backend não encontrado em ${PYTHON}. Crie o backend\\.venv antes.`)
  // Um servidor esquecido de outra rodada responderia no lugar do novo, com outro estado em memória
  for (const porta of [PORTA_API, PORTA_SITE]) {
    if (await portaOcupada(porta)) {
      const comoAchar = WINDOWS ? `netstat -ano | findstr :${porta}` : `lsof -i :${porta}`
      throw new Error(`A porta ${porta} já está em uso. Pare o processo que a ocupa (${comoAchar}) e rode de novo.`)
    }
  }
  // Capturas de uma rodada anterior não podem parecer desta
  rmSync(path.join(FRONTEND, 'cypress', 'screenshots'), { recursive: true, force: true })

  const ambiente = { ...process.env }
  for (const nome of [...Object.keys(segredos), 'E2E_RESET']) delete ambiente[nome]

  log('Recriando o banco estoque_e2e pelas migrations…')
  const preparo = spawnSync(PYTHON, ['-m', 'tests.e2e_preparar'], { cwd: BACKEND, env: { ...ambiente, ...segredos, ...chaves }, stdio: 'inherit' })
  if (preparo.status !== 0) throw new Error('A preparação do banco falhou.')

  log(`Subindo a API em ${API} e o site em ${SITE}…`)
  const api = subir('API', PYTHON, ['-m', 'tests.e2e_api'], { cwd: BACKEND, env: { ...ambiente, ...segredos, ...chaves, E2E_RESET: 'true' } })
  // Variável já definida vale mais que o frontend\.env no Vite
  const site = subir('Site', process.execPath, [VITE, '--port', String(PORTA_SITE), '--strictPort'], {
    cwd: FRONTEND,
    env: { ...ambiente, VITE_API_URL: API },
  })
  await Promise.all([esperar(api, `${API}/health`), esperar(site, SITE)])
  // Quem respondeu precisa ser o processo que acabou de subir
  for (const processo of [api, site]) if (processo.encerrado) falhar(processo, 'encerrou logo depois de subir.')

  // Sem as condições da RN-67 a rota não existe, e todos os testes cairiam sem dizer o motivo
  const reset = await fetch(`${API}/_test/reset`, { method: 'POST', headers: { 'X-E2E-Reset': '1' } })
  if (reset.status === 404) {
    throw new Error(
      'A rota de reset não foi registrada (RN-67). No backend\\.env, E2E_DATABASE_URL e E2E_APP_DATABASE_URL precisam ter ' +
        'o mesmo servidor, a mesma porta e o mesmo banco _e2e, sem parâmetros na URL, e APP_ENV não pode ser production.',
    )
  }
  if (reset.status !== 204) falhar(api, `respondeu ${reset.status} ao primeiro reset.`)

  log(ABRIR ? 'Abrindo o Cypress. Feche a janela dele para parar a API e o site.' : 'Rodando o Cypress…')
  return rodarCypress(ambiente)
}

for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sinal, () => {
    pararTudo()
    process.exit(130)
  })
}

let codigo = 1
try {
  codigo = await principal()
} catch (erro) {
  console.error(`[cypress] ${semSenhas(erro.message)}`)
} finally {
  pararTudo()
}
process.exitCode = codigo
