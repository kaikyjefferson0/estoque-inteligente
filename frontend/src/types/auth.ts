// Espelha os schemas UserOut e TokenOut do backend
export type Perfil = 'admin' | 'operador'

export interface Usuario {
  id: number
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  criado_em: string
  // RN-53: a conta de demonstração não troca a senha
  demo: boolean
}

export interface Token {
  access_token: string
  token_type: 'bearer'
}

export const NOME_DO_PERFIL: Record<Perfil, string> = {
  admin: 'Administrador',
  operador: 'Operador',
}
