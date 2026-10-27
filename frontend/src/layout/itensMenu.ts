import {
  IconAdjustmentsHorizontal,
  IconBell,
  IconBox,
  IconBuildingWarehouse,
  IconLayoutDashboard,
  IconPackageExport,
  IconPackageImport,
  IconTruck,
  IconUsers,
  type Icon,
} from '@tabler/icons-react'

export interface ItemMenu {
  rota: string
  rotulo: string
  icone: Icon
  // Escondido para o operador; a permissão real é verificada pelo backend
  soAdmin?: boolean
}

export const ITENS_MENU: ItemMenu[] = [
  { rota: '/', rotulo: 'Dashboard', icone: IconLayoutDashboard },
  { rota: '/estoque', rotulo: 'Estoque', icone: IconBuildingWarehouse },
  { rota: '/produtos', rotulo: 'Produtos', icone: IconBox },
  { rota: '/fornecedores', rotulo: 'Fornecedores', icone: IconTruck },
  { rota: '/entrada', rotulo: 'Entrada', icone: IconPackageImport },
  { rota: '/saida', rotulo: 'Saída', icone: IconPackageExport },
  { rota: '/alertas', rotulo: 'Alertas', icone: IconBell },
  { rota: '/ajustes', rotulo: 'Ajustes', icone: IconAdjustmentsHorizontal, soAdmin: true },
  { rota: '/usuarios', rotulo: 'Usuários', icone: IconUsers, soAdmin: true },
]
