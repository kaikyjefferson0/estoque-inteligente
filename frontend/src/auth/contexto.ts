import { createContext } from 'react'
import type { Usuario } from '../types/auth'

export interface AuthValor {
  usuario: Usuario | null
  // true enquanto confere o token salvo ao abrir o site
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => void
  // RN-48: depois de trocar a senha o token antigo não vale; volta ao login com aviso
  sairAposTrocarSenha: () => void
  // true depois de sairAposTrocarSenha, até o próximo login: o login mostra o aviso
  senhaTrocada: boolean
  // Depois de o admin editar o próprio cadastro, o cabeçalho mostra o nome novo
  atualizarUsuario: (usuario: Usuario) => void
}

export const AuthContext = createContext<AuthValor | null>(null)
