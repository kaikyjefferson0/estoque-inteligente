// Espelha o schema DashboardOut do backend (GET /dashboard)
export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste'

export interface MovimentacaoRecente {
  id: number
  tipo: TipoMovimentacao
  quantidade: number
  produto_id: number
  produto_nome: string
  lote_id: number
  validade: string | null
  usuario_nome: string
  criado_em: string
}

export interface Dashboard {
  total_produtos: number
  produtos_estoque_baixo: number
  produtos_sem_estoque: number
  lotes_a_vencer: number
  lotes_vencidos: number
  alertas_ativos: number
  ultimas_movimentacoes: MovimentacaoRecente[]
}
