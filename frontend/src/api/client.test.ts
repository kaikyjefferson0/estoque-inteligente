import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lerToken, salvarToken } from '../auth/token'
import { ApiError, EVENTO_SESSAO_EXPIRADA, api } from './client'

function resposta(status: number, corpo?: unknown): Response {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function simularFetch(...respostas: (Response | Error)[]) {
  const fetch = vi.fn()
  for (const r of respostas) {
    if (r instanceof Error) fetch.mockRejectedValueOnce(r)
    else fetch.mockResolvedValueOnce(r)
  }
  vi.stubGlobal('fetch', fetch)
  return fetch
}

async function erroDe(promessa: Promise<unknown>): Promise<ApiError> {
  try {
    await promessa
  } catch (erro) {
    if (erro instanceof ApiError) return erro
    throw erro
  }
  throw new Error('A chamada deveria ter falhado')
}

beforeEach(() => sessionStorage.clear())
afterEach(() => sessionStorage.clear())

describe('envio do token', () => {
  it('manda o token salvo no cabeçalho Authorization', async () => {
    salvarToken('abc.def.ghi')
    const fetch = simularFetch(resposta(200, { ok: true }))

    await expect(api('/products')).resolves.toEqual({ ok: true })

    const [, opcoes] = fetch.mock.calls[0]
    expect(opcoes.headers.Authorization).toBe('Bearer abc.def.ghi')
    expect(opcoes.method).toBe('GET')
  })

  it('sem token, não manda Authorization', async () => {
    const fetch = simularFetch(resposta(200, []))
    await api('/health')
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization')
  })

  it('com corpo, envia JSON por POST', async () => {
    const fetch = simularFetch(resposta(201, { id: 1 }))
    await api('/suppliers', { body: { nome: 'Atacado' } })
    const [, opcoes] = fetch.mock.calls[0]
    expect(opcoes.method).toBe('POST')
    expect(opcoes.headers['Content-Type']).toBe('application/json')
    expect(opcoes.body).toBe('{"nome":"Atacado"}')
  })
})

describe('401 levando ao login', () => {
  it('com token, apaga o token e avisa que a sessão expirou', async () => {
    salvarToken('vencido')
    simularFetch(resposta(401, { detail: 'Sessão ausente ou expirada. Entre no sistema para continuar.' }))
    const ouvinte = vi.fn()
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, ouvinte)

    const erro = await erroDe(api('/products'))

    window.removeEventListener(EVENTO_SESSAO_EXPIRADA, ouvinte)
    expect(erro.status).toBe(401)
    expect(lerToken()).toBeNull()
    expect(ouvinte).toHaveBeenCalledTimes(1)
  })

  it('no login (sem token), 401 é só "e-mail ou senha incorretos" e não dispara o evento', async () => {
    simularFetch(resposta(401, { detail: 'E-mail ou senha incorretos.' }))
    const ouvinte = vi.fn()
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, ouvinte)

    const erro = await erroDe(api('/auth/login', { form: new URLSearchParams({ username: 'a', password: 'b' }) }))

    window.removeEventListener(EVENTO_SESSAO_EXPIRADA, ouvinte)
    expect(erro.message).toBe('E-mail ou senha incorretos.')
    expect(ouvinte).not.toHaveBeenCalled()
  })
})

describe('mensagens de erro', () => {
  it('usa o detail em texto da API', async () => {
    simularFetch(resposta(409, { detail: 'Este e-mail já está cadastrado. Use outro e-mail.' }))
    const erro = await erroDe(api('/users', { body: {} }))
    expect(erro.status).toBe(409)
    expect(erro.message).toBe('Este e-mail já está cadastrado. Use outro e-mail.')
  })

  it('no 422 do Pydantic, separa os erros por campo', async () => {
    simularFetch(
      resposta(422, {
        detail: [
          { loc: ['body', 'senha_atual'], msg: 'A senha atual não confere.' },
          { loc: ['query', 'limite'], msg: 'Use até 200.' },
        ],
      }),
    )
    const erro = await erroDe(api('/auth/change-password', { body: {} }))
    expect(erro.message).toBe('Alguns campos estão inválidos. Corrija os destacados e tente de novo.')
    expect(erro.campos).toEqual({ senha_atual: 'A senha atual não confere.', 'query.limite': 'Use até 200.' })
  })

  it('sem detail, usa a mensagem do status', async () => {
    simularFetch(resposta(403, {}))
    expect((await erroDe(api('/users'))).message).toBe(
      'Seu perfil não tem permissão para esta ação. Fale com um administrador.',
    )
  })

  it('RN-47: 429 explica que é preciso esperar', async () => {
    simularFetch(resposta(429, {}))
    expect((await erroDe(api('/auth/login', { form: new URLSearchParams() }))).message).toBe(
      'Muitas tentativas. Aguarde um minuto e tente de novo.',
    )
  })

  it('erro do servidor sem JSON vira a mensagem genérica', async () => {
    simularFetch(new Response('Internal Server Error', { status: 500 }))
    expect((await erroDe(api('/dashboard'))).message).toBe('O servidor falhou ao responder. Tente de novo em instantes.')
  })

  it('sem conexão, diz para conferir a rede e a API (status 0)', async () => {
    simularFetch(new TypeError('Failed to fetch'))
    const erro = await erroDe(api('/dashboard'))
    expect(erro.status).toBe(0)
    expect(erro.message).toMatch(/Não foi possível falar com o servidor/)
  })

  it('204 devolve vazio, sem tentar ler JSON', async () => {
    simularFetch(new Response(null, { status: 204 }))
    await expect(api('/auth/change-password', { body: {} })).resolves.toBeUndefined()
  })
})
