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
  criado_em: string
}

export interface Lote {
  id: number
  validade: string | null
  quantidade: number
}

// GET /products/{id}/stock: só traz lotes com quantidade maior que zero
export interface SaldoProduto {
  produto_id: number
  saldo_fisico: number
  saldo_disponivel: number
  lotes: Lote[]
}
