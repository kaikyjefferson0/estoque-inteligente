import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  agruparCodigoDeBarras,
  formatarCnpj,
  formatarData,
  formatarDataHora,
  formatarDiaDaSemana,
  formatarHora,
  formatarPreco,
  hojeIso,
  lerData,
  lerPreco,
  normalizarCodigoDeBarras,
  partesDoDia,
  precoParaCampo,
  semQuebraNaUnidade,
  somenteDigitos,
} from './formato'

describe('partesDoDia (folha da marca e do login)', () => {
  it('usa o dia de Brasília, não o do computador em Tóquio', () => {
    // 20:00 UTC de 10/11 = 17:00 de 10/11 em Brasília e 05:00 de 11/11 em Tóquio
    expect(partesDoDia(new Date('2026-11-10T20:00:00Z'))).toEqual({
      dia: '10',
      mes: 'novembro',
      mesCurto: 'nov',
      ano: '2026',
      diaDaSemana: 'terça-feira',
    })
  })

  it('vira o dia à meia-noite de Brasília', () => {
    // 03:00 UTC de 11/11 = 00:00 de 11/11 em Brasília
    expect(partesDoDia(new Date('2026-11-11T03:00:00Z')).dia).toBe('11')
    expect(partesDoDia(new Date('2026-11-11T02:59:00Z')).dia).toBe('10')
  })
})

describe('agruparCodigoDeBarras', () => {
  it('separa o EAN-13 em 1-6-6, como sai impresso sob as barras', () => {
    expect(agruparCodigoDeBarras('7896000000011')).toEqual(['7', '896000', '000011'])
  })

  it('separa o EAN-8 em 4-4 e o UPC-A em 1-5-5-1', () => {
    expect(agruparCodigoDeBarras('96385074')).toEqual(['9638', '5074'])
    expect(agruparCodigoDeBarras('036000291452')).toEqual(['0', '36000', '29145', '2'])
  })

  it('mantém num grupo só o código de outro tamanho ou com letras', () => {
    expect(agruparCodigoDeBarras('12345')).toEqual(['12345'])
    expect(agruparCodigoDeBarras('ABC-123')).toEqual(['ABC-123'])
  })
})

// CT-82 / RN-04: o código de barras não tem espaço em branco
describe('normalizarCodigoDeBarras', () => {
  it('tira o espaço entre os grupos, como aparecem na tela', () => {
    expect(normalizarCodigoDeBarras('3037 3543')).toBe('30373543')
    expect(normalizarCodigoDeBarras('7 896000 000011')).toBe('7896000000011')
  })

  it('tira a quebra de linha que a cópia dos grupos leva (\\r\\n no Windows, \\n nos outros)', () => {
    expect(normalizarCodigoDeBarras('3037\r\n3543')).toBe('30373543')
    expect(normalizarCodigoDeBarras('3037\n3543')).toBe('30373543')
  })

  it('tira o espaço inseparável, o estreito e a tabulação', () => {
    expect(normalizarCodigoDeBarras('3037 3543')).toBe('30373543')
    expect(normalizarCodigoDeBarras('3037 3543')).toBe('30373543')
    expect(normalizarCodigoDeBarras('3037\t3543')).toBe('30373543')
  })

  it('tira os espaços das pontas e deixa vazio o que só tem espaço', () => {
    expect(normalizarCodigoDeBarras('  7896000000011\n')).toBe('7896000000011')
    expect(normalizarCodigoDeBarras('  \r\n ')).toBe('')
  })

  it('não mexe em letras, hífens e outros caracteres do código', () => {
    expect(normalizarCodigoDeBarras('ABC-123')).toBe('ABC-123')
    expect(normalizarCodigoDeBarras('7896000000011')).toBe('7896000000011')
  })
})

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

  it('dia do subtítulo em Brasília, sem o "-feira" e com maiúscula', () => {
    // 20:00 UTC de 10/11 = 17:00 de terça, 10/11, em Brasília (e já quarta, 11/11, em Tóquio)
    expect(formatarDiaDaSemana(new Date('2026-11-10T20:00:00Z'))).toBe('Terça, 10 de novembro')
    // Sábado e domingo não têm "-feira"
    expect(formatarDiaDaSemana(new Date('2026-11-14T15:00:00Z'))).toBe('Sábado, 14 de novembro')
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

// CT-94 / RN-60: o preço vai para a API como texto com ponto e 2 casas, sem passar por float
// Espaço inseparável, o que o Intl põe entre o R$ e o número
const NBSP = String.fromCharCode(0xa0)

describe('lerPreco (campo Preço do produto)', () => {
  it.each([
    ['12,50', '12.50'],
    ['12,5', '12.50'],
    ['12,', '12.00'],
    [',99', '0.99'],
    ['0,10', '0.10'],
    ['0', '0.00'],
    ['0,01', '0.01'],
    ['7', '7.00'],
    ['1.234,56', '1234.56'],
    ['1.234.567,89', '1234567.89'],
    ['99.999.999,99', '99999999.99'],
    ['99999999,99', '99999999.99'],
    ['007,50', '7.50'],
    ['  12,50 ', '12.50'],
    ['R$ 12,50', '12.50'],
    [`R$${NBSP}12,50`, '12.50'], // espaço inseparável, como o Intl escreve
  ])('vírgula: "%s" vai como "%s"', (digitado, enviado) => {
    expect(lerPreco(digitado)).toEqual({ ok: true, valor: enviado })
  })

  it.each([
    ['12.5', '12.50'],
    ['12.50', '12.50'],
    ['12.', '12.00'],
    ['.5', '0.50'],
    ['12.3', '12.30'],
  ])('ponto: "%s" vai como "%s"', (digitado, enviado) => {
    expect(lerPreco(digitado)).toEqual({ ok: true, valor: enviado })
  })

  // "12.345" seria doze mil no pt-BR ou 12 e uns centavos no estilo americano: em vez de adivinhar
  // (e gravar mil vezes mais ou menos), pede a vírgula
  it.each(['12.345', '1.234', '1.500', '1.234.567', '99.999.999'])('ponto em grupos de 3, sem vírgula ("%s"), é ambíguo e recusado', (digitado) => {
    expect(lerPreco(digitado)).toEqual({
      ok: false,
      erro: 'Ficou ambíguo. Use vírgula nos centavos (12,34) ou escreva sem ponto (12345).',
    })
  })

  it.each(['', '   ', 'R$', 'R$ '])('vazio ("%s") vai como null, sem preço', (digitado) => {
    expect(lerPreco(digitado)).toEqual({ ok: true, valor: null })
  })

  it.each(['-1', '-0,01', '−12,50', ' -5'])('negativo ("%s") é recusado', (digitado) => {
    expect(lerPreco(digitado)).toEqual({ ok: false, erro: 'O preço não pode ser negativo. Use 0 ou mais, ou deixe vazio.' })
  })

  it.each(['12,345', '0,001', '1.234,567', '0.001', '12.3456'])('3 casas ou mais ("%s") são recusadas', (digitado) => {
    expect(lerPreco(digitado)).toEqual({ ok: false, erro: 'Use no máximo 2 casas depois da vírgula. Exemplo: 12,50.' })
  })

  it.each(['100.000.000,00', '100000000', '123456789,5'])('acima de 99.999.999,99 ("%s") é recusado', (digitado) => {
    expect(lerPreco(digitado)).toEqual({ ok: false, erro: 'Use um preço de até R$ 99.999.999,99.' })
  })

  it.each(['abc', '12,50,1', '12.34,56', '1,234.56', ',', '.', '1e3', '12a', '0x10', 'NaN', 'Infinity', '+5'])(
    'formato inválido ("%s") é recusado',
    (digitado) => {
      expect(lerPreco(digitado)).toEqual({ ok: false, erro: 'Use só números, com vírgula nos centavos. Exemplo: 12,50.' })
    },
  )

  it('não perde centavo em valores que o float erra', () => {
    // 0.1 + 0.2 em float é 0.30000000000000004; aqui o texto vai inteiro
    expect(lerPreco('0,30')).toEqual({ ok: true, valor: '0.30' })
    expect(lerPreco('99.999.999,99')).toEqual({ ok: true, valor: '99999999.99' })
    expect(lerPreco('1,10')).toEqual({ ok: true, valor: '1.10' })
  })
})

describe('precoParaCampo (editar o preço salvo)', () => {
  it('troca o ponto pela vírgula e põe os pontos de milhar, como na lista', () => {
    expect(precoParaCampo('1234.50')).toBe('1.234,50')
    expect(precoParaCampo('99999999.99')).toBe('99.999.999,99')
    expect(precoParaCampo('123.45')).toBe('123,45')
    expect(precoParaCampo('0.00')).toBe('0,00')
  })

  it('sem preço, o campo fica vazio', () => {
    expect(precoParaCampo(null)).toBe('')
  })

  it('o que vai para o campo volta igual para a API', () => {
    for (const preco of ['0.00', '0.01', '12.50', '1234.56', '123456.78', '99999999.99']) {
      expect(lerPreco(precoParaCampo(preco))).toEqual({ ok: true, valor: preco })
    }
  })
})

describe('formatarPreco (lista e detalhe)', () => {
  it.each([
    ['12.50', `R$${NBSP}12,50`],
    ['0.00', `R$${NBSP}0,00`],
    ['0.01', `R$${NBSP}0,01`],
    ['1234.56', `R$${NBSP}1.234,56`],
    ['99999999.99', `R$${NBSP}99.999.999,99`],
  ])('"%s" sai como "%s", com espaço inseparável depois do R$', (preco, texto) => {
    expect(formatarPreco(preco)).toBe(texto)
  })

  it('sem preço, mostra "Sem preço", como o "Sem fornecedor"', () => {
    expect(formatarPreco(null)).toBe('Sem preço')
  })
})
