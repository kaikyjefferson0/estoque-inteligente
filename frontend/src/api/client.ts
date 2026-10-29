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
}

const MENSAGEM_POR_STATUS: Record<number, string> = {
  400: 'A API não aceitou os dados enviados. Confira os campos e tente de novo.',
  401: 'Sua sessão expirou. Entre de novo para continuar.',
  403: 'Seu perfil não tem permissão para esta ação. Fale com um administrador.',
  404: 'O item não foi encontrado. Ele pode ter sido removido; atualize a página.',
  409: 'Os dados entram em conflito com um registro existente. Confira e tente de novo.',
  422: 'Alguns campos estão inválidos. Corrija os destacados e tente de novo.',
  // RN-47 e RN-52: limites de tentativas de login e de troca de senha
  429: 'Muitas tentativas. Aguarde um minuto e tente de novo.',
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

  let resposta: Response
  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, {
      method: opcoes.method ?? (corpo ? 'POST' : 'GET'),
      headers,
      body: corpo,
      signal: opcoes.signal,
    })
  } catch (erro) {
    if (erro instanceof DOMException && erro.name === 'AbortError') throw erro
    throw new ApiError(0, MENSAGEM_SEM_CONEXAO)
  }

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
