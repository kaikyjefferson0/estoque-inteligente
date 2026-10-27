import { useEffect } from 'react'

const SISTEMA = 'Estoque Inteligente'

/** Título da aba do navegador: "Estoque | Estoque Inteligente". */
export function useTituloDaPagina(titulo: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} | ${SISTEMA}` : SISTEMA
  }, [titulo])
}
