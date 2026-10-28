import { formatarNumero } from './formato'

/** "1 a 50 de 312": a faixa de itens mostrada e o total (RN-51). */
export function descreverIntervalo(total: number, limite: number, deslocamento: number): string {
  if (total <= 0) return 'Nenhum item'
  const inicio = Math.min(deslocamento + 1, total)
  const fim = Math.min(deslocamento + limite, total)
  return `${formatarNumero(inicio)} a ${formatarNumero(fim)} de ${formatarNumero(total)}`
}

/** Deslocamento da última página que tem itens (0 quando a lista está vazia). */
export function ultimoDeslocamento(total: number, limite: number): number {
  return total > 0 ? Math.floor((total - 1) / limite) * limite : 0
}
