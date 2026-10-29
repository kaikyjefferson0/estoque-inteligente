import { createContext } from 'react'
import type { Usuario } from '../types/auth'

export interface AuthValor {
  usuario: Usuario | null
  // true enquanto confere o token salvo ao abrir o site
  carregando: boolean
  // aoAcordar: chamada se a API estiver acordando (partida a frio), para a tela avisar
  entrar: (email: string, senha: string, aoAcordar?: () => void) => Promise<void>
  sair: () => void
  // RN-48: depois de trocar a senha o token antigo não vale; volta ao login com aviso
  sairAposTrocarSenha: () => void
  // true depois de sairAposTrocarSenha, até o próximo login: o login mostra o aviso
  senhaTrocada: boolean
  // Depois de o admin editar o próprio cadastro, o cabeçalho mostra o nome novo
  atualizarUsuario: (usuario: Usuario) => void
}

export const AuthContext = createContext<AuthValor | null>(null)
