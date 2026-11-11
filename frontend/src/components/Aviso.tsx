import type { ReactNode } from 'react'
import type { Situacao } from '../types/situacao'
import { ICONE_DA_SITUACAO } from '../utils/situacao'

/** Mensagem dentro da página: fundo claro da situação e o mesmo ícone do sinal dela. */
export function Aviso({ situacao, children }: { situacao: Situacao; children: ReactNode }) {
  const Icone = ICONE_DA_SITUACAO[situacao]
  return (
    <div className={`aviso etiqueta--${situacao}`} role={situacao === 'ok' ? 'status' : 'alert'}>
      <Icone className="aviso__icone" aria-hidden />
      <div className="aviso__texto">{children}</div>
    </div>
  )
}
