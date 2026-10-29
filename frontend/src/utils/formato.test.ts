import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatarCnpj, formatarData, formatarDataHora, formatarHora, hojeIso, lerData, semQuebraNaUnidade, somenteDigitos } from './formato'

afterEach(() => {
  vi.useRealTimers()
})

describe('datas no fuso America/Sao_Paulo', () => {
  it('o teste roda com o computador em outro fuso (Tóquio)', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Asia/Tokyo')
  })

  it('data e hora saem no horário de Brasília, em 24h', () => {
    // 02:30 UTC de 28/10 = 23:30 de 27/10 em Brasília (e 11:30 de 28/10 em Tóquio)
    const texto = formatarDataHora('2026-10-28T02:30:00Z')
    expect(texto).toContain('27/10/2026')
    expect(texto).toContain('23:30')
  })

  it('hora curta no horário de Brasília', () => {
    expect(formatarHora(new Date('2026-10-28T15:05:00Z'))).toBe('12:05')
  })

  it('"hoje" é o dia de Brasília, não o do computador nem o UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-28T02:30:00Z'))
    expect(hojeIso()).toBe('2026-10-27')
    vi.setSystemTime(new Date('2026-10-28T03:00:00Z'))
    expect(hojeIso()).toBe('2026-10-28')
  })

  it('validade AAAA-MM-DD é formatada sem passar por fuso', () => {
    expect(formatarData('2027-03-01')).toBe('01/03/2027')
  })

  it('lê a data digitada e recusa dias que não existem', () => {
    expect(lerData('12/03/2027')).toBe('2027-03-12')
    expect(lerData('31/02/2027')).toBeNull()
    expect(lerData('2027-03-12')).toBeNull()
  })
})

describe('máscara do CNPJ', () => {
  it('formata os 14 números', () => {
    expect(formatarCnpj('12345678000195')).toBe('12.345.678/0001-95')
  })

  it('formata aos poucos, enquanto a pessoa digita', () => {
    expect(formatarCnpj('1')).toBe('1')
    expect(formatarCnpj('123')).toBe('12.3')
    expect(formatarCnpj('123456')).toBe('12.345.6')
    expect(formatarCnpj('123456789')).toBe('12.345.678/9')
    expect(formatarCnpj('1234567800019')).toBe('12.345.678/0001-9')
  })

  it('ignora o que não é número e corta no 14º dígito', () => {
    expect(formatarCnpj('12.345.678/0001-95')).toBe('12.345.678/0001-95')
    expect(formatarCnpj('12a345b678c0001d95999')).toBe('12.345.678/0001-95')
    expect(formatarCnpj('')).toBe('')
  })

  it('somenteDigitos tira pontuação e espaços', () => {
    expect(somenteDigitos(' 12.345.678/0001-95 ')).toBe('12345678000195')
  })
})

describe('semQuebraNaUnidade', () => {
  it('junta o número à unidade com espaço inseparável', () => {
    expect(semQuebraNaUnidade('Café torrado e moído 500 g')).toBe('Café torrado e moído 500 g')
    expect(semQuebraNaUnidade('Papel higiênico folha dupla 12 rolos')).toBe('Papel higiênico folha dupla 12 rolos')
    expect(semQuebraNaUnidade('Leite integral 1 L')).toBe('Leite integral 1 L')
  })

  it('não mexe no resto do texto', () => {
    expect(semQuebraNaUnidade('Pão de forma tradicional')).toBe('Pão de forma tradicional')
    expect(semQuebraNaUnidade('Lote 14, validade 01/11/2026')).toBe('Lote 14, validade 01/11/2026')
  })
})
