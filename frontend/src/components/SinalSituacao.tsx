import type { ReactNode } from 'react'
import type { Situacao } from '../types/situacao'
import { ICONE_DA_SITUACAO } from '../utils/situacao'

/**
 * Situação escrita com o seu sinal (identidade Folhinha): ícone na cor da situação e o texto
 * que a nomeia. Com `textoNaCor` (padrão), atenção e crítico também pintam o texto; o "ok"
 * fica calmo, em texto suave.
 */
export function SinalSituacao({
  situacao,
  children,
  textoNaCor = true,
  className,
}: {
  situacao: Situacao
  children: ReactNode
  textoNaCor?: boolean
  className?: string
}) {
  const Icone = ICONE_DA_SITUACAO[situacao]
  const classes = ['sinal', `sinal--${situacao}`, textoNaCor && 'sinal--texto-na-cor', className].filter(Boolean).join(' ')
  return (
    <span className={classes}>
      <Icone className="sinal__icone" aria-hidden />
      <span>{children}</span>
    </span>
  )
}
