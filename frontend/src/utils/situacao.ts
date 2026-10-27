import type { SituacaoEstoque } from '../types/estoque'
import type { Lote } from '../types/produto'
import type { Situacao } from '../types/situacao'
import { diasEntre, formatarData, formatarNumero, plural } from './formato'

export const SITUACAO_DO_ESTOQUE: Record<SituacaoEstoque, { etiqueta: Situacao; rotulo: string }> = {
  ok: { etiqueta: 'ok', rotulo: 'Em dia' },
  baixo: { etiqueta: 'atencao', rotulo: 'Estoque baixo' },
  sem_estoque: { etiqueta: 'critico', rotulo: 'Sem estoque' },
}

export interface SituacaoDoLote {
  etiqueta: Situacao
  rotulo: string
  vencido: boolean
}

/**
 * A situação vem da API (lote.situacao). Aqui só se escolhe a etiqueta e o texto;
 * a contagem de dias do "Vence em N dias" usa o "hoje" de Brasília, só para exibir.
 */
export function situacaoDoLote(lote: Lote, hoje: string): SituacaoDoLote {
  if (lote.situacao === 'vencido') {
    return { etiqueta: 'critico', rotulo: lote.validade ? `Vencido em ${formatarData(lote.validade)}` : 'Vencido', vencido: true }
  }
  if (lote.situacao === 'a_vencer') {
    const dias = lote.validade ? Math.max(diasEntre(hoje, lote.validade), 0) : 0
    const rotulo = dias === 0 ? 'Vence hoje' : `Vence em ${formatarNumero(dias)} ${plural(dias, 'dia', 'dias')}`
    return { etiqueta: 'atencao', rotulo, vencido: false }
  }
  return { etiqueta: 'ok', rotulo: lote.validade ? 'Dentro da validade' : 'Sem validade', vencido: false }
}

export function descreverLote(validade: string | null): string {
  return validade ? `Validade ${formatarData(validade)}` : 'Sem validade'
}
