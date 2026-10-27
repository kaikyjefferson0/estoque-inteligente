// Espelha os schemas AlertOut e AlertGenerationOut do backend (GET /alerts, POST /alerts/generate)
export type TipoAlerta = 'estoque_baixo' | 'vencimento_proximo' | 'vencido'

export interface Alerta {
  id: number
  tipo: TipoAlerta
  produto_id: number
  produto_nome: string
  // Vazios no estoque_baixo
  lote_id: number | null
  validade: string | null
  criado_em: string
  // RN-39: preenchido quando a condição deixou de existir
  resolvido_em: string | null
}

export interface GeracaoDeAlertas {
  criados: number
  resolvidos: number
}
