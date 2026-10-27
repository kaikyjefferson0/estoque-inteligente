import { IconLoader2, IconRefresh, type Icon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Aviso } from './Aviso'
import { Botao } from './Botao'

export function Carregando({ texto = 'Carregando…', telaCheia = false }: { texto?: string; telaCheia?: boolean }) {
  return (
    <div className={telaCheia ? 'estado estado--tela-cheia' : 'estado'} role="status" aria-live="polite">
      <IconLoader2 className="girando estado__icone" aria-hidden />
      <p>{texto}</p>
    </div>
  )
}

export function ErroEstado({ mensagem, aoTentarDeNovo }: { mensagem: string; aoTentarDeNovo?: () => void }) {
  return (
    <div className="estado estado--erro">
      <Aviso situacao="critico">
        <p>{mensagem}</p>
      </Aviso>
      {aoTentarDeNovo && (
        <Botao icone={IconRefresh} onClick={aoTentarDeNovo}>
          Tentar de novo
        </Botao>
      )}
    </div>
  )
}

interface VazioProps {
  icone: Icon
  titulo: string
  children?: ReactNode
  // Ação que resolve o vazio, por exemplo <BotaoLink to="/entrada">Registrar entrada</BotaoLink>
  acao?: ReactNode
}

/** Estado vazio: diz o que falta e convida a uma ação. */
export function Vazio({ icone: Icone, titulo, children, acao }: VazioProps) {
  return (
    <div className="estado estado--vazio">
      <Icone className="estado__icone" aria-hidden />
      <p className="estado__titulo">{titulo}</p>
      {children && <p className="estado__texto">{children}</p>}
      {acao}
    </div>
  )
}
