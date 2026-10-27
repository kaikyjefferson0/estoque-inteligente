import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

interface EstadoComMensagem {
  mensagem?: string
}

/**
 * Lê a confirmação enviada pela página anterior, por exemplo
 * navigate('/produtos/3', { state: { mensagem: 'Produto cadastrado' } }),
 * e limpa o estado do histórico para ela não voltar ao recarregar a página.
 */
export function useMensagemDaNavegacao(): string | null {
  const location = useLocation()
  const navigate = useNavigate()
  const recebida = (location.state as EstadoComMensagem | null)?.mensagem
  const [mensagem] = useState(recebida ?? null)

  useEffect(() => {
    if (recebida) navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [recebida, navigate, location.pathname, location.search])

  return mensagem
}
