import { useCallback, useEffect, useState } from 'react'
import { api, mensagemDeErro } from '../api/client'
import { montarCaminho } from '../api/caminho'
import type { Alerta, TipoAlerta } from '../types/alerta'
import type { Pagina } from '../types/pagina'

// RN-51: a API devolve no máximo 200 por página
const POR_PAGINA = 200

async function buscarTodos(tipo: TipoAlerta, signal: AbortSignal): Promise<Alerta[]> {
  const todos: Alerta[] = []
  for (;;) {
    const pagina = await api<Pagina<Alerta>>(
      montarCaminho('/alerts', { tipo, limite: POR_PAGINA, deslocamento: todos.length || null }),
      { signal },
    )
    todos.push(...pagina.itens)
    // Página vazia encerra mesmo se o total mudou entre uma busca e outra
    if (pagina.itens.length === 0 || todos.length >= pagina.total) return todos
  }
}

interface Resultado {
  chave: number
  alertas: Alerta[] | null
  erro: string | null
  atualizadoEm: Date | null
}

export interface Vencimentos {
  // Mantém os últimos alertas enquanto recarrega, para a régua não piscar
  alertas: Alerta[] | null
  erro: string | null
  carregando: boolean
  /** Hora da resposta: o "hoje" da régua é o desse instante */
  atualizadoEm: Date | null
  recarregar: () => void
}

/**
 * Alertas de validade ativos (vencimento próximo e vencido) para a régua do Painel. Lê a tabela
 * de alertas, como o menu (RN-44), e busca todas as páginas: a régua não pode esconder um lote.
 */
export function useVencimentos(): Vencimentos {
  const [versao, setVersao] = useState(0)
  const [resultado, setResultado] = useState<Resultado>({ chave: -1, alertas: null, erro: null, atualizadoEm: null })

  useEffect(() => {
    const controle = new AbortController()
    Promise.all([buscarTodos('vencimento_proximo', controle.signal), buscarTodos('vencido', controle.signal)])
      .then(([proximos, vencidos]) =>
        setResultado({ chave: versao, alertas: [...vencidos, ...proximos], erro: null, atualizadoEm: new Date() }),
      )
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setResultado((anterior) => ({ ...anterior, chave: versao, erro: mensagemDeErro(e) }))
      })
    return () => controle.abort()
  }, [versao])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  const carregando = resultado.chave !== versao

  return {
    alertas: resultado.alertas,
    erro: carregando ? null : resultado.erro,
    carregando,
    atualizadoEm: resultado.atualizadoEm,
    recarregar,
  }
}
