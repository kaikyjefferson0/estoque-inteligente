import { IconChevronDown } from '@tabler/icons-react'
import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'

interface CampoSelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string
  erro?: string
  dica?: ReactNode
  children: ReactNode
}

/** Lista de opções nativa (teclado e leitor de tela de graça), com a aparência do Campo. */
export function CampoSelecao({ rotulo, erro, dica, id, className, children, ...resto }: CampoSelecaoProps) {
  const gerado = useId()
  const idCampo = id ?? gerado
  const idDica = dica ? `${idCampo}-dica` : undefined
  const idErro = erro ? `${idCampo}-erro` : undefined
  const descritores = [idDica, idErro].filter(Boolean).join(' ') || undefined

  return (
    <div className={['campo', erro && 'campo--erro', className].filter(Boolean).join(' ')}>
      <label className="campo__rotulo" htmlFor={idCampo}>
        {rotulo}
      </label>
      <div className="campo__caixa campo__caixa--selecao">
        <select
          id={idCampo}
          className="campo__entrada campo__selecao"
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores}
          {...resto}
        >
          {children}
        </select>
        <IconChevronDown className="campo__seta" aria-hidden />
      </div>
      {dica && (
        <p id={idDica} className="campo__dica">
          {dica}
        </p>
      )}
      {erro && (
        <p id={idErro} className="campo__erro">
          {erro}
        </p>
      )}
    </div>
  )
}
