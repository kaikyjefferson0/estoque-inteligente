import { useCallback, useState } from 'react'

export type ErrosDeCampo<C extends string> = Partial<Record<C, string>>

/**
 * Padrão de erros dos formulários:
 * - o erro de um campo some assim que a pessoa edita aquele campo (limpar);
 * - ao falhar a validação, o foco vai para o primeiro campo inválido e um
 *   resumo é anunciado na região aria-live (anuncio);
 * - erros de campo da API (422) entram pelo mesmo caminho (mostrar).
 * O campo precisa ter `name` igual à chave do erro.
 */
export function useErrosDoFormulario<C extends string>(ordem: readonly C[]) {
  const [erros, setErros] = useState<ErrosDeCampo<C>>({})
  const [anuncio, setAnuncio] = useState('')

  const limpar = useCallback((campo: C) => {
    setErros((atuais) => {
      if (!atuais[campo]) return atuais
      const { [campo]: _removido, ...resto } = atuais
      return resto as ErrosDeCampo<C>
    })
  }, [])

  /** Mostra os erros; devolve true se não havia nenhum. */
  const mostrar = useCallback(
    (form: HTMLFormElement, novos: ErrosDeCampo<C>): boolean => {
      setErros(novos)
      const invalidos = ordem.filter((campo) => novos[campo])
      if (invalidos.length === 0) {
        setAnuncio('')
        return true
      }
      const primeiro = form.elements.namedItem(invalidos[0])
      if (primeiro instanceof HTMLElement) primeiro.focus()
      const resumo =
        invalidos.length === 1
          ? `Corrija 1 campo: ${novos[invalidos[0]]}`
          : `Corrija ${invalidos.length} campos. Primeiro: ${novos[invalidos[0]]}`
      // Alterna um espaço no fim para o leitor de tela repetir a mesma mensagem
      setAnuncio((anterior) => (anterior === resumo ? `${resumo} ` : resumo))
      return false
    },
    [ordem],
  )

  return { erros, anuncio, limpar, mostrar }
}
