import { useEffect, useState } from 'react'

/** Devolve o valor só depois que ele para de mudar por `ms` milissegundos (ex.: busca). */
export function useAtraso<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor)

  useEffect(() => {
    const espera = setTimeout(() => setAtrasado(valor), ms)
    return () => clearTimeout(espera)
  }, [valor, ms])

  return atrasado
}
