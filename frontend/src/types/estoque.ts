// Espelha os schemas de app/schemas/stock.py
import type { TipoMovimentacao } from './dashboard'

// sem_estoque: disponível zero; baixo: disponível <= mínimo (RN-13, RN-41)
export type SituacaoEstoque = 'ok' | 'baixo' | 'sem_estoque'

// GET /stock
export interface ItemEstoque {
  produto_id: number
  nome: string
  codigo_barras: string
  saldo_fisico: number
  saldo_disponivel: number
  estoque_minimo: number
  situacao: SituacaoEstoque
}

// GET /products/{id}/movements, do mais recente para o mais antigo
export interface Movimentacao {
  id: number
  tipo: TipoMovimentacao
  // No ajuste é a diferença (saldo_novo - saldo_anterior), com sinal
  quantidade: number
  lote_id: number
  validade: string | null
  motivo: string | null
  // RN-34: preenchidos só nas linhas de ajuste
  saldo_anterior: number | null
  saldo_novo: number | null
  usuario_id: number
  usuario_nome: string
  criado_em: string
}

// POST /stock/entries
export interface EntradaRegistrada {
  movimentacao_id: number
  produto_id: number
  lote_id: number
  validade: string | null
  quantidade: number
  quantidade_lote: number
  // Saldo físico do produto depois da entrada
  saldo_total: number
  usuario_id: number
  criado_em: string
}

// POST /stock/exits: uma linha por lote atingido, em ordem FEFO (RN-10)
export interface SaidaDoLote {
  movimentacao_id: number
  lote_id: number
  validade: string | null
  quantidade: number
  quantidade_lote: number
}

export interface SaidaRegistrada {
  produto_id: number
  quantidade: number
  lotes: SaidaDoLote[]
  saldo_total: number
  usuario_id: number
  criado_em: string
}

// POST /stock/adjustments
export interface AjusteRegistrado {
  movimentacao_id: number
  produto_id: number
  lote_id: number
  validade: string | null
  quantidade: number
  saldo_anterior: number
  saldo_novo: number
  motivo: string
  saldo_total: number
  usuario_id: number
  criado_em: string
}
