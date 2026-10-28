import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ITENS_POR_PAGINA } from '../types/pagina'

export const PARAMETRO_PAGINA = 'pagina'
// Evita deslocamento acima do que a API aceita quando alguém digita uma página enorme no endereço
const MAIOR_PAGINA = 1_000_000

/**
 * Página atual de uma lista, guardada no endereço (?pagina=3) para sobreviver ao "voltar".
 * Quem troca filtro ou busca apaga o parâmetro, e a lista volta para a primeira página.
 */
export function usePaginaNaUrl(limite = ITENS_POR_PAGINA) {
  const [parametros, setParametros] = useSearchParams()
  const pagina = Math.min(Math.max(Math.floor(Number(parametros.get(PARAMETRO_PAGINA))) || 1, 1), MAIOR_PAGINA)

  const irPara = useCallback(
    (deslocamento: number) =>
      setParametros(
        (atuais) => {
          const novos = new URLSearchParams(atuais)
          const destino = Math.floor(deslocamento / limite) + 1
          if (destino > 1) novos.set(PARAMETRO_PAGINA, String(destino))
          else novos.delete(PARAMETRO_PAGINA)
          return novos
        },
        { replace: true },
      ),
    [limite, setParametros],
  )

  return { limite, deslocamento: (pagina - 1) * limite, irPara }
}
