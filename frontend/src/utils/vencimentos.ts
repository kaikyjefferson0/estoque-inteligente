import type { Alerta } from '../types/alerta'
import { diasEntre, hojeIso } from './formato'

/** Dias da régua de vencimentos do Painel, a partir de hoje (em Brasília). */
export const DIAS_DA_REGUA = 21

const MS_DIA = 86_400_000
// As datas da régua são dias de calendário (AAAA-MM-DD), sem hora: formatar em UTC devolve o
// mesmo dia em qualquer fuso do computador
const SEMANA = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: 'UTC' })
const SEMANA_LONGA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' })
const MES = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
const DIA_E_MES = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })

export interface DiaDaRegua {
  /** AAAA-MM-DD */
  data: string
  dia: number
  /** "qua", "sáb" */
  semana: string
  /** "nov"; preenchido só no primeiro dia da régua e no dia 1 de cada mês */
  mes: string | null
  /** "quarta-feira, 11 de novembro", para o leitor de tela */
  descricao: string
  hoje: boolean
  /** Lotes em alerta com validade neste dia */
  lotes: number
}

export interface Regua {
  dias: DiaDaRegua[]
  /** Lotes com validade já passada */
  vencidos: number
  /** Lotes em alerta que vencem depois do último dia da régua */
  depois: number
  /** Último dia da régua (AAAA-MM-DD) */
  ultimoDia: string
  /** Soma dos lotes dentro da régua */
  lotesNaRegua: number
}

function somarDias(data: string, dias: number): string {
  return new Date(Date.parse(`${data}T00:00:00Z`) + dias * MS_DIA).toISOString().slice(0, 10)
}

function semPonto(texto: string): string {
  return texto.replace('.', '')
}

/**
 * Agrupa os alertas de validade ativos (vencimento próximo e vencido, RN-14 e RN-15) por dia,
 * contando LOTES: o mesmo lote conta uma vez só. Um alerta de vencimento próximo cuja validade
 * já passou conta como vencido: o tipo só muda na próxima geração de alertas (RN-44), mas a
 * régua mostra o que é verdade hoje. Alertas de estoque baixo (sem lote) ficam de fora.
 */
export function montarRegua(alertas: Alerta[], agora = new Date()): Regua {
  const hoje = hojeIso(agora)
  const ultimoDia = somarDias(hoje, DIAS_DA_REGUA - 1)

  // Validade de cada lote (o primeiro alerta encontrado vale; os dois tipos trazem a mesma validade)
  const validades = new Map<number, string>()
  for (const alerta of alertas) {
    if (alerta.tipo === 'estoque_baixo' || alerta.lote_id === null || alerta.validade === null) continue
    if (alerta.resolvido_em !== null) continue
    if (!validades.has(alerta.lote_id)) validades.set(alerta.lote_id, alerta.validade)
  }

  const porDia = new Map<string, number>()
  let vencidos = 0
  let depois = 0
  for (const validade of validades.values()) {
    const distancia = diasEntre(hoje, validade)
    if (distancia < 0) vencidos += 1
    else if (distancia >= DIAS_DA_REGUA) depois += 1
    else porDia.set(validade, (porDia.get(validade) ?? 0) + 1)
  }

  const dias: DiaDaRegua[] = Array.from({ length: DIAS_DA_REGUA }, (_, indice) => {
    const data = somarDias(hoje, indice)
    const instante = new Date(`${data}T00:00:00Z`)
    const dia = instante.getUTCDate()
    return {
      data,
      dia,
      semana: semPonto(SEMANA.format(instante)),
      mes: indice === 0 || dia === 1 ? semPonto(MES.format(instante)) : null,
      descricao: `${SEMANA_LONGA.format(instante)}, ${DIA_E_MES.format(instante)}`,
      hoje: indice === 0,
      lotes: porDia.get(data) ?? 0,
    }
  })

  return {
    dias,
    vencidos,
    depois,
    ultimoDia,
    lotesNaRegua: dias.reduce((soma, dia) => soma + dia.lotes, 0),
  }
}
