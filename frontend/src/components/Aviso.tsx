import type { ReactNode } from 'react'
import type { Situacao } from '../types/situacao'
import { ICONE_DA_SITUACAO } from '../utils/situacao'

interface AvisoProps {
  situacao: Situacao
  children: ReactNode
  // Seletor do teste de ponta a ponta (Cypress)
  dataCy?: string
}

/** Mensagem dentro da página: fundo claro da situação e o mesmo ícone do sinal dela. */
export function Aviso({ situacao, children, dataCy }: AvisoProps) {
  const Icone = ICONE_DA_SITUACAO[situacao]
  return (
    <div className={`aviso etiqueta--${situacao}`} role={situacao === 'ok' ? 'status' : 'alert'} data-cy={dataCy}>
      <Icone className="aviso__icone" aria-hidden />
      <div className="aviso__texto">{children}</div>
    </div>
  )
}
