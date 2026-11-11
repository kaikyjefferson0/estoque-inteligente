import { IconBarcode } from '@tabler/icons-react'
import { agruparCodigoDeBarras } from '../utils/formato'

/**
 * Padrão único do código de barras em todas as telas: ícone, dígitos em grupos como os impressos
 * sob as barras (EAN-13 em 1-6-6), algarismos tabulares e sem quebra. O espaço entre os grupos
 * vem do CSS, então copiar dá só os dígitos ("7896000000011").
 */
export function CodigoDeBarras({ codigo, className }: { codigo: string; className?: string }) {
  return (
    <span className={['codigo-barras', className].filter(Boolean).join(' ')} title={codigo}>
      <IconBarcode className="codigo-barras__icone" aria-hidden />
      <span className="codigo-barras__digitos">
        {agruparCodigoDeBarras(codigo).map((grupo, i) => (
          <span key={i}>{grupo}</span>
        ))}
      </span>
    </span>
  )
}
