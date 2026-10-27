import { useCallback, useEffect, useState } from 'react'
import { api, mensagemDeErro } from './client'

interface Recurso<T> {
  // Mantém os últimos dados enquanto recarrega, para a tela não piscar
  dados: T | null
  erro: string | null
  carregando: boolean
  atualizadoEm: Date | null
  recarregar: () => void
}

interface Resultado<T> {
  chave: string
  dados: T | null
  erro: string | null
  atualizadoEm: Date | null
}

/** Busca um GET da API e expõe os estados de carregando, erro e dados. */
export function useRecurso<T>(caminho: string): Recurso<T> {
  const [versao, setVersao] = useState(0)
  const [resultado, setResultado] = useState<Resultado<T>>({ chave: '', dados: null, erro: null, atualizadoEm: null })
  const chave = `${caminho}#${versao}`

  useEffect(() => {
    const controle = new AbortController()
    api<T>(caminho, { signal: controle.signal })
      .then((dados) => setResultado({ chave, dados, erro: null, atualizadoEm: new Date() }))
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setResultado((anterior) => ({ ...anterior, chave, erro: mensagemDeErro(e) }))
      })
    return () => controle.abort()
  }, [caminho, chave])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  // Carregando enquanto a resposta da chave atual não chegou
  const carregando = resultado.chave !== chave

  return {
    dados: resultado.dados,
    erro: carregando ? null : resultado.erro,
    carregando,
    atualizadoEm: resultado.atualizadoEm,
    recarregar,
  }
}
