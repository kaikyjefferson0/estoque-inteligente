import { IconAlertCircle, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import type { Situacao } from '../types/situacao'

const ICONE = { ok: IconCircleCheck, atencao: IconAlertTriangle, critico: IconAlertCircle }

/** Mensagem dentro da página, com a etiqueta de prateleira na cor da situação. */
export function Aviso({ situacao, children }: { situacao: Situacao; children: ReactNode }) {
  const Icone = ICONE[situacao]
  return (
    <div className={`aviso etiqueta etiqueta--${situacao}`} role={situacao === 'ok' ? 'status' : 'alert'}>
      <Icone className="aviso__icone" aria-hidden />
      <div className="aviso__texto">{children}</div>
    </div>
  )
}
