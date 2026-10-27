import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Carregando } from '../components/Estados'
import { useAuth } from './useAuth'

/** Exige login; quem não está logado vai para /login e volta depois para onde estava. */
export function RotaProtegida() {
  const { usuario, carregando, senhaTrocada } = useAuth()
  const location = useLocation()

  if (carregando) return <Carregando texto="Conferindo sua sessão…" telaCheia />
  // Depois de trocar a senha, o novo login vai para o painel, não de volta para Minha conta
  if (!usuario) return <Navigate to="/login" replace state={senhaTrocada ? undefined : { de: location.pathname }} />
  return <Outlet />
}

/**
 * Esconde a página do operador. É só conveniência de interface:
 * quem garante a permissão de verdade é o backend (require_admin).
 */
export function RotaAdmin() {
  const { usuario } = useAuth()
  if (usuario?.perfil !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}
