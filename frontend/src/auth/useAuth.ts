import { useContext } from 'react'
import { AuthContext, type AuthValor } from './contexto'

export function useAuth(): AuthValor {
  const valor = useContext(AuthContext)
  if (!valor) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return valor
}
