import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string
  erro?: string
  dica?: string
  // Botão dentro do campo, à direita (ex.: mostrar senha)
  acessorio?: ReactNode
}

export function Campo({ rotulo, erro, dica, acessorio, id, className, ...resto }: CampoProps) {
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
      <div className="campo__caixa">
        <input
          id={idCampo}
          className="campo__entrada"
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores}
          {...resto}
        />
        {acessorio}
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
