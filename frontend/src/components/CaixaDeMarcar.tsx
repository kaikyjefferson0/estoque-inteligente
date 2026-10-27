import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface CaixaDeMarcarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  rotulo: string
  erro?: string
  dica?: ReactNode
}

/** Caixa de marcar com rótulo clicável, dica e erro ligados por aria-describedby. */
export function CaixaDeMarcar({ rotulo, erro, dica, id, className, ...resto }: CaixaDeMarcarProps) {
  const gerado = useId()
  const idCampo = id ?? gerado
  const idDica = dica ? `${idCampo}-dica` : undefined
  const idErro = erro ? `${idCampo}-erro` : undefined
  const descritores = [idDica, idErro].filter(Boolean).join(' ') || undefined

  return (
    <div className={['marcar', erro && 'marcar--erro', className].filter(Boolean).join(' ')}>
      <label className="marcar__linha" htmlFor={idCampo}>
        <input
          id={idCampo}
          type="checkbox"
          className="marcar__caixa"
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores}
          {...resto}
        />
        <span className="marcar__rotulo">{rotulo}</span>
      </label>
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
