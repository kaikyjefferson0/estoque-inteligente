// Espelha os schemas ProductOut e ProductStockOut do backend
export interface Produto {
  id: number
  nome: string
  codigo_barras: string
  estoque_minimo: number
  controla_validade: boolean
  // Preenchido só quando controla validade (RN-26)
  dias_alerta_validade: number | null
  fornecedor_id: number | null
  // Só leitura: nome do fornecedor, para a tela não buscar a lista de fornecedores
  fornecedor_nome: string | null
  criado_em: string
}

// RN-14, RN-15 e RN-44: decidida pela API com as mesmas condições dos alertas
export type SituacaoLote = 'ok' | 'a_vencer' | 'vencido'

export interface Lote {
  id: number
  validade: string | null
  quantidade: number
  situacao: SituacaoLote
}

// GET /products/{id}/stock: só traz lotes com quantidade maior que zero
export interface SaldoProduto {
  produto_id: number
  saldo_fisico: number
  saldo_disponivel: number
  lotes: Lote[]
}
