import { describe, expect, it } from 'vitest'
import { normalizarEnderecoApi } from './enderecoApi'

describe('normalizarEnderecoApi', () => {
  it('acrescenta https:// quando o endereço vem sem esquema', () => {
    expect(normalizarEnderecoApi('estoque-api.onrender.com')).toBe('https://estoque-api.onrender.com')
    expect(normalizarEnderecoApi(' estoque-api.onrender.com/ ')).toBe('https://estoque-api.onrender.com')
  })

  it('mantém o esquema que já veio e tira a barra do final', () => {
    expect(normalizarEnderecoApi('https://estoque-api.onrender.com/')).toBe('https://estoque-api.onrender.com')
    expect(normalizarEnderecoApi('http://127.0.0.1:8000')).toBe('http://127.0.0.1:8000')
  })

  it('vazio ou ausente fica vazio', () => {
    expect(normalizarEnderecoApi(undefined)).toBe('')
    expect(normalizarEnderecoApi('  ')).toBe('')
  })
})
