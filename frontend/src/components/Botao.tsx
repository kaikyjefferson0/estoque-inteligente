import { IconLoader2, type Icon } from '@tabler/icons-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variante = 'primaria' | 'secundaria' | 'fantasma' | 'perigo'

interface PropsComuns {
  variante?: Variante
  icone?: Icon
  larguraTotal?: boolean
  children: ReactNode
}

function classes(variante: Variante, larguraTotal?: boolean, extra?: string) {
  return ['botao', `botao--${variante}`, larguraTotal && 'botao--largura-total', extra].filter(Boolean).join(' ')
}

interface BotaoProps extends PropsComuns, Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  carregando?: boolean
  // Texto mostrado enquanto carrega, por exemplo "Entrando…"
  textoCarregando?: string
}

export function Botao({
  variante = 'secundaria',
  icone: Icone,
  larguraTotal,
  carregando = false,
  textoCarregando,
  disabled,
  className,
  children,
  type = 'button',
  ...resto
}: BotaoProps) {
  return (
    <button
      type={type}
      className={classes(variante, larguraTotal, className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      data-carregando={carregando || undefined}
      {...resto}
    >
      {carregando ? <IconLoader2 className="girando" aria-hidden /> : Icone && <Icone aria-hidden />}
      <span>{carregando && textoCarregando ? textoCarregando : children}</span>
    </button>
  )
}

type BotaoLinkProps = PropsComuns & LinkProps

/** Link com aparência de botão, para ações que levam a outra página. */
export function BotaoLink({ variante = 'secundaria', icone: Icone, larguraTotal, className, children, ...resto }: BotaoLinkProps) {
  return (
    <Link className={classes(variante, larguraTotal, className)} {...resto}>
      {Icone && <Icone aria-hidden />}
      <span>{children}</span>
    </Link>
  )
}
