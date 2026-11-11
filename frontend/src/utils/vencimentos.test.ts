import { describe, expect, it } from 'vitest'
import type { Alerta, TipoAlerta } from '../types/alerta'
import { DIAS_DA_REGUA, montarRegua } from './vencimentos'

let proximoId = 1
function alerta(tipo: TipoAlerta, lote_id: number | null, validade: string | null, resolvido_em: string | null = null): Alerta {
  return {
    id: proximoId++,
    tipo,
    produto_id: 1,
    produto_nome: 'Leite integral 1 L',
    lote_id,
    validade,
    criado_em: '2026-11-01T12:00:00Z',
    resolvido_em,
  }
}

// 15:00 UTC de 11/11 = 12:00 de 11/11 em Brasília (e 00:00 de 12/11 em Tóquio, o fuso dos testes)
const MEIO_DIA_11_NOV = new Date('2026-11-11T15:00:00Z')

function lotesNoDia(regua: ReturnType<typeof montarRegua>, data: string): number | undefined {
  return regua.dias.find((d) => d.data === data)?.lotes
}

describe('montarRegua (régua de vencimentos do Painel)', () => {
  it('tem 21 dias a partir de hoje, com hoje marcado', () => {
    const regua = montarRegua([], MEIO_DIA_11_NOV)
    expect(regua.dias).toHaveLength(DIAS_DA_REGUA)
    expect(regua.dias[0]).toMatchObject({ data: '2026-11-11', dia: 11, hoje: true, semana: 'qua' })
    expect(regua.dias.filter((d) => d.hoje)).toHaveLength(1)
    expect(regua.ultimoDia).toBe('2026-12-01')
    expect(regua.lotesNaRegua).toBe(0)
  })

  it('agrupa por dia e conta lotes, não alertas', () => {
    const regua = montarRegua(
      [
        alerta('vencimento_proximo', 1, '2026-11-14'),
        alerta('vencimento_proximo', 2, '2026-11-14'),
        alerta('vencimento_proximo', 3, '2026-11-20'),
        // O mesmo lote em dois alertas conta uma vez só
        alerta('vencimento_proximo', 3, '2026-11-20'),
      ],
      MEIO_DIA_11_NOV,
    )
    expect(lotesNoDia(regua, '2026-11-14')).toBe(2)
    expect(lotesNoDia(regua, '2026-11-20')).toBe(1)
    expect(lotesNoDia(regua, '2026-11-15')).toBe(0)
    expect(regua.lotesNaRegua).toBe(3)
  })

  it('deixa de fora o estoque baixo e os alertas resolvidos', () => {
    const regua = montarRegua(
      [
        alerta('estoque_baixo', null, null),
        alerta('vencimento_proximo', 4, '2026-11-13', '2026-11-10T10:00:00Z'),
        alerta('vencido', 5, '2026-11-01', '2026-11-10T10:00:00Z'),
      ],
      MEIO_DIA_11_NOV,
    )
    expect(regua.lotesNaRegua).toBe(0)
    expect(regua.vencidos).toBe(0)
  })

  it('separa os vencidos (antes de hoje) e os que vencem depois do 21º dia', () => {
    const regua = montarRegua(
      [
        alerta('vencido', 6, '2026-11-10'),
        // Ainda com o tipo antigo: o alerta só vira "vencido" na próxima geração (RN-44)
        alerta('vencimento_proximo', 7, '2026-11-09'),
        alerta('vencimento_proximo', 8, '2026-12-01'),
        alerta('vencimento_proximo', 9, '2026-12-02'),
        alerta('vencimento_proximo', 10, '2027-01-15'),
      ],
      MEIO_DIA_11_NOV,
    )
    expect(regua.vencidos).toBe(2)
    expect(lotesNoDia(regua, '2026-12-01')).toBe(1)
    expect(regua.depois).toBe(2)
  })

  it('o lote que vence hoje fica na régua, não nos vencidos (RN-36)', () => {
    const regua = montarRegua([alerta('vencimento_proximo', 11, '2026-11-11')], MEIO_DIA_11_NOV)
    expect(regua.dias[0].lotes).toBe(1)
    expect(regua.vencidos).toBe(0)
  })

  it('usa o hoje de Brasília, não o do computador em Tóquio', () => {
    // 02:30 UTC de 12/11 = 23:30 de 11/11 em Brasília e 11:30 de 12/11 em Tóquio
    const regua = montarRegua([alerta('vencimento_proximo', 12, '2026-11-11')], new Date('2026-11-12T02:30:00Z'))
    expect(regua.dias[0].data).toBe('2026-11-11')
    expect(regua.dias[0].lotes).toBe(1)
    expect(regua.vencidos).toBe(0)
  })

  it('vira o dia à meia-noite de Brasília', () => {
    // 03:00 UTC de 12/11 = 00:00 de 12/11 em Brasília: o lote de 11/11 venceu ontem
    const regua = montarRegua([alerta('vencimento_proximo', 13, '2026-11-11')], new Date('2026-11-12T03:00:00Z'))
    expect(regua.dias[0].data).toBe('2026-11-12')
    expect(regua.vencidos).toBe(1)
  })

  it('escreve o mês no primeiro dia e na virada do mês', () => {
    const regua = montarRegua([alerta('vencimento_proximo', 14, '2026-12-01')], MEIO_DIA_11_NOV)
    const comMes = regua.dias.filter((d) => d.mes !== null).map((d) => [d.data, d.mes])
    expect(comMes).toEqual([
      ['2026-11-11', 'nov'],
      ['2026-12-01', 'dez'],
    ])
    expect(regua.dias.at(-1)).toMatchObject({ dia: 1, lotes: 1, descricao: 'terça-feira, 1 de dezembro' })
  })

  it('atravessa a virada do ano', () => {
    // 28/12/2026 às 10:00 em Brasília
    const regua = montarRegua([alerta('vencimento_proximo', 15, '2027-01-02')], new Date('2026-12-28T13:00:00Z'))
    expect(regua.dias.map((d) => d.dia).slice(0, 6)).toEqual([28, 29, 30, 31, 1, 2])
    expect(regua.dias[4].mes).toBe('jan')
    expect(lotesNoDia(regua, '2027-01-02')).toBe(1)
    expect(regua.ultimoDia).toBe('2027-01-17')
  })

  it('conta o dia 29 de fevereiro no ano bissexto', () => {
    // 20/02/2028 às 10:00 em Brasília; 2028 é bissexto
    const regua = montarRegua([alerta('vencimento_proximo', 16, '2028-02-29')], new Date('2028-02-20T13:00:00Z'))
    expect(lotesNoDia(regua, '2028-02-29')).toBe(1)
    expect(regua.dias.find((d) => d.data === '2028-03-01')?.mes).toBe('mar')
  })
})
