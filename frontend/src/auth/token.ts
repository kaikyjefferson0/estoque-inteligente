// O token fica no sessionStorage: some ao fechar a aba
const CHAVE = 'estoque.token'

export function lerToken(): string | null {
  try {
    return sessionStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

export function salvarToken(token: string): void {
  try {
    sessionStorage.setItem(CHAVE, token)
  } catch {
    // Navegador sem sessionStorage: a sessão dura só enquanto a página estiver aberta
  }
}

export function apagarToken(): void {
  try {
    sessionStorage.removeItem(CHAVE)
  } catch {
    // nada a apagar
  }
}
