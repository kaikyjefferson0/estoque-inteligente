import { IconBarcode } from '@tabler/icons-react'
import { agruparCodigoDeBarras } from '../utils/formato'

/**
 * Padrão único do código de barras em todas as telas: ícone, dígitos em grupos como os impressos
 * sob as barras (EAN-13 em 1-6-6), algarismos tabulares e sem quebra. Os grupos ficam em linha e o
 * espaço entre eles é margem do CSS (`componentes.css`), então copiar dá só os dígitos
 * ("7896000000011"). Em flex, cada grupo viraria um bloco, e a cópia levaria uma quebra de linha.
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
