// RN-51: formato das listas da API (GET /products, /suppliers, /stock, /alerts, /users e /products/{id}/movements)
export interface Pagina<T> {
  itens: T[]
  // Todos os itens que passam nos filtros e na busca, não só os desta página
  total: number
  limite: number
  deslocamento: number
}

// Padrão da API; o máximo aceito é 200
export const ITENS_POR_PAGINA = 50
