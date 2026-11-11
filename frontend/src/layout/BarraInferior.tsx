import * as Dialog from '@radix-ui/react-dialog'
import { IconMenu2, type Icon } from '@tabler/icons-react'
import { matchPath, NavLink, useLocation } from 'react-router-dom'
import { useAlertasAtivos } from '../alertas/useAlertasAtivos'
import { useAuth } from '../auth/useAuth'
import { formatarNumero, plural } from '../utils/formato'
import { ITENS_MENU } from './itensMenu'

// As quatro tarefas do balcão; o resto do menu fica na gaveta, aberta pelo "Mais"
const ROTAS_DA_BARRA = ['/', '/entrada', '/saida', '/alertas']
const ITENS_DA_BARRA = ROTAS_DA_BARRA.map((rota) => ITENS_MENU.find((item) => item.rota === rota)!)

// Item da barra: rótulo embaixo do ícone, contorno do circulado sempre presente (transparente
// fora da página atual) e o foco pelo teclado com outra forma: fundo neutro e anel de 3px
const ITEM =
  'flex min-h-item-barra w-full min-w-esp-0 flex-col items-center justify-center gap-esp-1 rounded-p border-circulado bg-transparent px-esp-1 text-fs-1 leading-titulo no-underline transition-colors hover:bg-hover-neutro hover:text-texto active:bg-pressionado-neutro focus-visible:bg-hover-neutro focus-visible:text-texto focus-visible:foco-forte-dentro'

function classeDoItem(atual: boolean): string {
  return `${ITEM} ${atual ? 'border-texto font-medio text-texto' : 'border-transparent text-texto-suave'}`
}

function Conteudo({ icone: Icone, rotulo, contagem }: { icone: Icon; rotulo: string; contagem?: number }) {
  return (
    <>
      {/* Contagem de alertas ativos (a mesma do menu) ao lado do ícone, na mesma linha: o sino
          fica sempre inteiro e o par cabe no item de 59px em 320px. Acima de 99 fica "99+"
          (o número inteiro está no nome do link) */}
      <span className="flex items-center gap-esp-1">
        <Icone className="size-icone-m shrink-0" aria-hidden />
        {contagem !== undefined && contagem > 0 && (
          <span className="numero rounded-p bg-atencao-fundo px-esp-1 text-fs-1 leading-numero font-medio text-atencao-texto">
            {contagem > 99 ? '99+' : formatarNumero(contagem)}
          </span>
        )}
      </span>
      <span className="max-w-full truncate">{rotulo}</span>
    </>
  )
}

/**
 * Barra inferior do celular e do tablet (até 900px): Painel, Entrada, Saída e Alertas ao alcance
 * do polegar, e "Mais", que abre a gaveta com o menu inteiro. Fica dentro do Dialog.Root da gaveta.
 */
export function BarraInferior() {
  const { pathname } = useLocation()
  const { usuario } = useAuth()
  const { ativos } = useAlertasAtivos()
  const numero = ativos ?? 0

  // Página de fora da barra (ex.: Estoque, Produtos): o "Mais" fica circulado e diz onde a pessoa está
  const naBarra = ROTAS_DA_BARRA.some((rota) => matchPath({ path: rota, end: rota === '/' }, pathname))
  const paginaNaGaveta = naBarra
    ? undefined
    : ITENS_MENU.filter((item) => !ROTAS_DA_BARRA.includes(item.rota))
        .filter((item) => !item.soAdmin || usuario?.perfil === 'admin')
        .find((item) => matchPath({ path: item.rota, end: false }, pathname))

  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-esp-0 bottom-esp-0 z-cabecalho hidden border-t-tinta bg-superficie pb-area-segura ate-900:block"
    >
      <ul className="grid grid-cols-5 gap-esp-1 p-esp-1">
        {ITENS_DA_BARRA.map(({ rota, rotulo, icone, contagem }) => {
          const comContagem = contagem === 'alertas' && numero > 0
          return (
            <li key={rota} className="flex min-w-esp-0">
              {/* Com contagem, o nome começa pelo texto visível: "Alertas, 11 ativos" (como no menu) */}
              <NavLink
                to={rota}
                end={rota === '/'}
                className={({ isActive }) => classeDoItem(isActive)}
                aria-label={comContagem ? `${rotulo}, ${formatarNumero(numero)} ${plural(numero, 'ativo', 'ativos')}` : undefined}
              >
                <Conteudo icone={icone} rotulo={rotulo} contagem={contagem === 'alertas' ? numero : undefined} />
              </NavLink>
            </li>
          )
        })}
        <li className="flex min-w-esp-0">
          <Dialog.Trigger
            className={classeDoItem(paginaNaGaveta !== undefined)}
            aria-label={paginaNaGaveta ? `Mais, você está em ${paginaNaGaveta.rotulo}` : undefined}
          >
            <Conteudo icone={IconMenu2} rotulo="Mais" />
          </Dialog.Trigger>
        </li>
      </ul>
    </nav>
  )
}
