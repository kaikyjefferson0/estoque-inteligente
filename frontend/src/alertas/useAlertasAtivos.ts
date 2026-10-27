import { useContext } from 'react'
import { AlertasAtivosContext, type AlertasAtivosValor } from './contexto'

export function useAlertasAtivos(): AlertasAtivosValor {
  const valor = useContext(AlertasAtivosContext)
  if (!valor) throw new Error('useAlertasAtivos precisa estar dentro de <AlertasAtivosProvider>')
  return valor
}
