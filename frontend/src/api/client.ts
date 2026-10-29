import { apagarToken, lerToken } from '../auth/token'
import { normalizarEnderecoApi } from './enderecoApi'

const BASE_URL = normalizarEnderecoApi(import.meta.env.VITE_API_URL)

// Disparado quando a API recusa o token (401); o AuthProvider escuta e manda para o login
export const EVENTO_SESSAO_EXPIRADA = 'estoque:sessao-expirada'

export class ApiError extends Error {
  readonly status: number
  // Erros de validação por campo (422), quando a API informa o campo
  readonly campos: Record<string, string>

  constructor(status: number, mensagem: string, campos: Record<string, string> = {}) {
    super(mensagem)
    this.name = 'ApiError'
    this.status = status
    this.campos = campos
  }
}

interface Opcoes {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  // Corpo JSON
  body?: unknown
  // Corpo de formulário (usado no login OAuth2)
  form?: URLSearchParams
  signal?: AbortSignal
  // Partida a frio: com esta função, 503 ou falta de resposta viram novas tentativas
  // (ESPERAS_AO_ACORDAR_MS); ela é chamada uma vez, antes da primeira espera, para a tela avisar.
  // Só para chamadas que podem se repetir sem efeito duplicado (o login e as leituras).
  aoAcordar?: () => void
}

// Plano gratuito do Render: a API dorme sem acesso e, enquanto acorda, o proxy responde 503
// (sem CORS, então o navegador costuma ver só a falta de resposta). Esperas crescentes, 1 minuto no total.
export const ESPERAS_AO_ACORDAR_MS = [2000, 4000, 8000, 16000, 30000]
export const MENSAGEM_ACORDANDO = 'A API está acordando, isso pode levar até um minuto.'

const MENSAGEM_POR_STATUS: Record<number, string> = {
  400: 'A API não aceitou os dados enviados. Confira os campos e tente de novo.',
  401: 'Sua sessão expirou. Entre de novo para continuar.',
  403: 'Seu perfil não tem permissão para esta ação. Fale com um administrador.',
  404: 'O item não foi encontrado. Ele pode ter sido removido; atualize a página.',
  409: 'Os dados entram em conflito com um registro existente. Confira e tente de novo.',
  422: 'Alguns campos estão inválidos. Corrija os destacados e tente de novo.',
  // RN-47 e RN-52: limites de tentativas de login e de troca de senha
  429: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
  503: 'A API está fora do ar no momento. Tente de novo em alguns minutos.',
}

const MENSAGEM_SERVIDOR = 'O servidor falhou ao responder. Tente de novo em instantes.'
const MENSAGEM_SEM_CONEXAO =
  'Não foi possível falar com o servidor. Confira sua conexão e se a API está no ar, e tente de novo.'

interface ErroDeValidacao {
  loc?: (string | number)[]
  msg?: string
}

function lerDetalhe(status: number, detalhe: unknown): ApiError {
  if (typeof detalhe === 'string' && detalhe.trim()) {
    return new ApiError(status, detalhe)
  }
  // FastAPI/Pydantic: lista de { loc: ["body", "campo"], msg }
  if (Array.isArray(detalhe)) {
    const campos: Record<string, string> = {}
    for (const item of detalhe as ErroDeValidacao[]) {
      const campo = item.loc?.filter((parte) => parte !== 'body').join('.')
      if (campo && item.msg && !campos[campo]) campos[campo] = item.msg
    }
    return new ApiError(status, MENSAGEM_POR_STATUS[422], campos)
  }
  return new ApiError(status, MENSAGEM_POR_STATUS[status] ?? MENSAGEM_SERVIDOR)
}

async function buscar(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init)
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') throw erro
    throw new ApiError(0, MENSAGEM_SEM_CONEXAO)
  }
}

function esperar(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const relogio = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(relogio)
        reject(new DOMException('A chamada foi cancelada.', 'AbortError'))
      },
      { once: true },
    )
  })
}

/** Sem aoAcordar, uma tentativa só; com ele, tenta de novo enquanto a API acorda. */
async function buscarEsperandoAcordar(url: string, init: RequestInit, aoAcordar?: () => void): Promise<Response> {
  for (let tentativa = 0; ; tentativa++) {
    const ultima = !aoAcordar || tentativa >= ESPERAS_AO_ACORDAR_MS.length
    try {
      const resposta = await buscar(url, init)
      if (resposta.status !== 503 || ultima) return resposta
    } catch (erro) {
      if (ultima || !(erro instanceof ApiError)) throw erro
    }
    if (tentativa === 0) aoAcordar?.()
    await esperar(ESPERAS_AO_ACORDAR_MS[tentativa], init.signal)
  }
}

/** Função única para chamar a API. Devolve o JSON da resposta ou lança ApiError. */
export async function api<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const token = lerToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let corpo: BodyInit | undefined
  if (opcoes.form) {
    corpo = opcoes.form
  } else if (opcoes.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    corpo = JSON.stringify(opcoes.body)
  }

  const resposta = await buscarEsperandoAcordar(
    `${BASE_URL}${caminho}`,
    { method: opcoes.method ?? (corpo ? 'POST' : 'GET'), headers, body: corpo, signal: opcoes.signal },
    opcoes.aoAcordar,
  )

  if (resposta.status === 204) return undefined as T

  let dados: unknown = null
  try {
    dados = await resposta.json()
  } catch {
    // resposta sem JSON
  }

  if (!resposta.ok) {
    // Só derruba a sessão se havia token; no login, 401 é "e-mail ou senha incorretos"
    if (resposta.status === 401 && token) {
      apagarToken()
      window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA))
    }
    const detalhe = (dados as { detail?: unknown } | null)?.detail
    throw lerDetalhe(resposta.status, detalhe)
  }

  return dados as T
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) return erro.message
  return MENSAGEM_SERVIDOR
}
