import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { IconChevronDown, IconLogout, IconMenu2, IconUserCircle, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AlertasAtivosProvider } from '../alertas/AlertasAtivosProvider'
import { useAuth } from '../auth/useAuth'
import { NOME_DO_PERFIL } from '../types/auth'
import { MenuLateral } from './MenuLateral'

function Marca() {
  return (
    <Link to="/" className="marca">
      <span className="marca__etiqueta" aria-hidden />
      <span>Estoque Inteligente</span>
    </Link>
  )
}

function MenuDoUsuario() {
  const { usuario, sair } = useAuth()
  if (!usuario) return null
  const perfil = NOME_DO_PERFIL[usuario.perfil]

  return (
    <DropdownMenu.Root>
      {/* Nome longo ganha reticências; o texto inteiro aparece ao passar o mouse e no menu aberto */}
      <DropdownMenu.Trigger className="usuario" aria-label={`${usuario.nome}, ${perfil}: abrir menu da conta`} title={usuario.nome}>
        <IconUserCircle className="usuario__icone" aria-hidden />
        <span className="usuario__textos">
          <span className="usuario__nome">{usuario.nome}</span>
          <span className="usuario__perfil">{perfil}</span>
        </span>
        <IconChevronDown className="usuario__seta" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="suspenso" align="end" sideOffset={8} collisionPadding={16}>
          <div className="suspenso__cabecalho">
            <p className="suspenso__nome">{usuario.nome}</p>
            <p className="suspenso__email">{usuario.email}</p>
          </div>
          <DropdownMenu.Separator className="suspenso__separador" />
          <DropdownMenu.Item className="suspenso__item" asChild>
            <Link to="/minha-conta">
              <IconUserCircle aria-hidden />
              <span>Minha conta</span>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="suspenso__item" onSelect={sair}>
            <IconLogout aria-hidden />
            <span>Sair</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function AppLayout() {
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const { pathname } = useLocation()
  const [rotaAnterior, setRotaAnterior] = useState(pathname)

  // Fecha a gaveta ao trocar de página (inclusive pelo voltar do navegador)
  if (rotaAnterior !== pathname) {
    setRotaAnterior(pathname)
    setGavetaAberta(false)
  }

  return (
    <AlertasAtivosProvider>
      <div className="app">
        <a href="#conteudo" className="pular-conteudo">
          Pular para o conteúdo
        </a>
        <header className="cabecalho">
          <div className="cabecalho__inicio">
            <Dialog.Root open={gavetaAberta} onOpenChange={setGavetaAberta}>
              <Dialog.Trigger className="botao-icone cabecalho__menu" aria-label="Abrir menu">
                <IconMenu2 aria-hidden />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="sobreposicao" />
                <Dialog.Content className="gaveta" aria-describedby={undefined}>
                  <div className="gaveta__topo">
                    <Dialog.Title asChild>
                      <span className="gaveta__titulo">Menu</span>
                    </Dialog.Title>
                    <Dialog.Close className="botao-icone" aria-label="Fechar menu">
                      <IconX aria-hidden />
                    </Dialog.Close>
                  </div>
                  <MenuLateral aoNavegar={() => setGavetaAberta(false)} />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <Marca />
          </div>
          <MenuDoUsuario />
        </header>
        <div className="app__corpo">
          <aside className="lateral">
            <MenuLateral />
          </aside>
          <main id="conteudo" className="conteudo" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </AlertasAtivosProvider>
  )
}
