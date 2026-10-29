import { NavLink } from 'react-router-dom'
import { useAlertasAtivos } from '../alertas/useAlertasAtivos'
import { useAuth } from '../auth/useAuth'
import { formatarNumero, plural } from '../utils/formato'
import { ITENS_MENU } from './itensMenu'

/** Lista de navegação usada na barra lateral e na gaveta do celular. */
export function MenuLateral({ aoNavegar }: { aoNavegar?: () => void }) {
  const { usuario } = useAuth()
  const { ativos } = useAlertasAtivos()
  const itens = ITENS_MENU.filter((item) => !item.soAdmin || usuario?.perfil === 'admin')

  return (
    <nav aria-label="Menu principal">
      <ul className="menu">
        {itens.map(({ rota, rotulo, icone: Icone, contagem }) => {
          // Só o item de alertas tem contagem; com zero, não mostra número
          const numero = contagem === 'alertas' && ativos ? ativos : 0
          return (
            <li key={rota}>
              {/* Com contagem, o nome do link diz "Alertas, 11 ativos" no leitor de tela; um texto
                  oculto ao lado do número grudaria nele ao copiar ("11ativos") */}
              <NavLink
                to={rota}
                end={rota === '/'}
                className="menu__link"
                onClick={aoNavegar}
                aria-label={numero > 0 ? `${rotulo}, ${formatarNumero(numero)} ${plural(numero, 'ativo', 'ativos')}` : undefined}
              >
                <Icone className="menu__icone" aria-hidden />
                <span className="menu__rotulo">{rotulo}</span>
                {numero > 0 && <span className="menu__contagem numero">{formatarNumero(numero)}</span>}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
