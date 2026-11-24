import { IconLoader2, IconRefresh, type Icon } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Aviso } from './Aviso'
import { Botao } from './Botao'

interface CarregandoProps {
  texto?: string
  telaCheia?: boolean
  // Seletor do teste de ponta a ponta (Cypress), aqui e nos estados abaixo
  dataCy?: string
}

export function Carregando({ texto = 'Carregando…', telaCheia = false, dataCy = 'carregando' }: CarregandoProps) {
  return (
    <div className={telaCheia ? 'estado estado--tela-cheia' : 'estado'} role="status" aria-live="polite" data-cy={dataCy}>
      <IconLoader2 className="girando estado__icone" aria-hidden />
      <p>{texto}</p>
    </div>
  )
}

interface ErroEstadoProps {
  mensagem: string
  aoTentarDeNovo?: () => void
  dataCy?: string
}

export function ErroEstado({ mensagem, aoTentarDeNovo, dataCy = 'erro-carregamento' }: ErroEstadoProps) {
  return (
    <div className="estado estado--erro" data-cy={dataCy}>
      <Aviso situacao="critico">
        <p>{mensagem}</p>
      </Aviso>
      {aoTentarDeNovo && (
        <Botao icone={IconRefresh} onClick={aoTentarDeNovo} data-cy="btn-tentar-de-novo">
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
  dataCy?: string
}

/** Estado vazio: diz o que falta e convida a uma ação. */
export function Vazio({ icone: Icone, titulo, children, acao, dataCy = 'lista-vazia' }: VazioProps) {
  return (
    <div className="estado estado--vazio" data-cy={dataCy}>
      <Icone className="estado__icone" aria-hidden />
      <p className="estado__titulo">{titulo}</p>
      {children && <p className="estado__texto">{children}</p>}
      {acao}
    </div>
  )
}
