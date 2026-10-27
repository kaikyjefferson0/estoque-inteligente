import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { ITENS_MENU } from './itensMenu'

/** Lista de navegação usada na barra lateral e na gaveta do celular. */
export function MenuLateral({ aoNavegar }: { aoNavegar?: () => void }) {
  const { usuario } = useAuth()
  const itens = ITENS_MENU.filter((item) => !item.soAdmin || usuario?.perfil === 'admin')

  return (
    <nav aria-label="Menu principal">
      <ul className="menu">
        {itens.map(({ rota, rotulo, icone: Icone }) => (
          <li key={rota}>
            <NavLink to={rota} end={rota === '/'} className="menu__link" onClick={aoNavegar}>
              <Icone className="menu__icone" aria-hidden />
              <span>{rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
