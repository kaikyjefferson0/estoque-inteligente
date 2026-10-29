import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, EVENTO_SESSAO_EXPIRADA } from '../api/client'
import type { Token, Usuario } from '../types/auth'
import { AuthContext } from './contexto'
import { apagarToken, lerToken, salvarToken } from './token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(() => lerToken() !== null)
  const [senhaTrocada, setSenhaTrocada] = useState(false)

  useEffect(() => {
    if (!lerToken()) return
    const controle = new AbortController()
    // Partida a frio: espera a API acordar em vez de perder a sessão (o carregando já aparece)
    api<Usuario>('/auth/me', { signal: controle.signal, aoAcordar: () => {} })
      .then(setUsuario)
      .catch((erro) => {
        if (erro instanceof DOMException && erro.name === 'AbortError') return
        apagarToken()
        setUsuario(null)
      })
      .finally(() => {
        if (!controle.signal.aborted) setCarregando(false)
      })
    return () => controle.abort()
  }, [])

  // 401 em qualquer chamada: o client já apagou o token; aqui voltamos ao login
  useEffect(() => {
    function aoExpirar() {
      setUsuario(null)
      navigate('/login', { replace: true, state: { expirou: true } })
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar)
  }, [navigate])

  const entrar = useCallback(async (email: string, senha: string, aoAcordar?: () => void) => {
    // OAuth2PasswordRequestForm: o campo username recebe o e-mail
    const form = new URLSearchParams({ username: email, password: senha })
    // O login pode se repetir: um 503 do Render nem chega à API (e não conta no limite da RN-47)
    const token = await api<Token>('/auth/login', { method: 'POST', form, aoAcordar })
    salvarToken(token.access_token)
    try {
      setUsuario(await api<Usuario>('/auth/me'))
      setSenhaTrocada(false)
    } catch (erro) {
      apagarToken()
      throw erro
    }
  }, [])

  const sair = useCallback(() => {
    apagarToken()
    setUsuario(null)
    navigate('/login', { replace: true })
  }, [navigate])

  // Sem navigate aqui: ao perder o usuário, a RotaProtegida já leva ao login
  const sairAposTrocarSenha = useCallback(() => {
    apagarToken()
    setSenhaTrocada(true)
    setUsuario(null)
  }, [])

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, sair, sairAposTrocarSenha, senhaTrocada, atualizarUsuario: setUsuario }),
    [usuario, carregando, entrar, sair, sairAposTrocarSenha, senhaTrocada],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
