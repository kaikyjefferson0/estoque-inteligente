import { createContext } from 'react'

export interface AlertasAtivosValor {
  // null até a primeira resposta da API
  ativos: number | null
  // Busca a contagem de novo (troca de página, entrada, saída, ajuste, "Verificar agora")
  atualizarAlertas: () => void
}

export const AlertasAtivosContext = createContext<AlertasAtivosValor | null>(null)
