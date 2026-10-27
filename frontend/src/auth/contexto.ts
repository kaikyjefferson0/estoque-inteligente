import { createContext } from 'react'
import type { Usuario } from '../types/auth'

export interface AuthValor {
  usuario: Usuario | null
  // true enquanto confere o token salvo ao abrir o site
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => void
}

export const AuthContext = createContext<AuthValor | null>(null)
