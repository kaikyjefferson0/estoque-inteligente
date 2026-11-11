import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { IconChevronDown, IconLogout, IconUserCircle, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { AlertasAtivosProvider } from '../alertas/AlertasAtivosProvider'
import { useAuth } from '../auth/useAuth'
import { FolhaMarca } from '../components/Folha'
import { NOME_DO_PERFIL } from '../types/auth'
import { BarraInferior } from './BarraInferior'
import { MenuLateral } from './MenuLateral'

function Marca() {
  return (
    <Link to="/" className="marca">
      <FolhaMarca />
      <span>Estoque Inteligente</span>
    </Link>
  )
}

function MenuDoUsuario() {
  const { usuario, sair } = useAuth()
  if (!usuario) return null
  const perfil = NOME_DO_PERFIL[usuario.perfil]
  // Nome acessível começando pelo texto visível (WCAG 2.5.3: quem usa comando de voz diz o que vê),
  // sem repetir o perfil quando ele é o próprio nome ("Administrador") e sem começar por
  // "Abrir menu", que é o nome do botão da gaveta
  const nomeAcessivel = usuario.nome === perfil ? `${usuario.nome}, menu da conta` : `${usuario.nome}, ${perfil}, menu da conta`

  return (
    <DropdownMenu.Root>
      {/* Nome longo ganha reticências; o texto inteiro aparece ao passar o mouse e no menu aberto */}
      <DropdownMenu.Trigger className="usuario" aria-label={nomeAcessivel} title={usuario.nome}>
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
      {/* A gaveta abre pelo "Mais" da barra inferior (até 900px); acima disso o menu é a lateral */}
      <Dialog.Root open={gavetaAberta} onOpenChange={setGavetaAberta}>
        <div className="app">
          <a href="#conteudo" className="pular-conteudo">
            Pular para o conteúdo
          </a>
          <header className="cabecalho">
            <div className="cabecalho__inicio">
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
          <BarraInferior />
        </div>
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
    </AlertasAtivosProvider>
  )
}
