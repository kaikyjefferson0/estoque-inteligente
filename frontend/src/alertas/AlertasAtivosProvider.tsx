import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/client'
import type { Alerta } from '../types/alerta'
import type { Pagina } from '../types/pagina'
import { AlertasAtivosContext } from './contexto'

/**
 * Quantidade de alertas ativos mostrada no menu. Lê a tabela de alertas (RN-44),
 * então reflete a última geração: a de cada movimentação (RN-40) ou a do "Verificar agora".
 */
export function AlertasAtivosProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const [ativos, setAtivos] = useState<number | null>(null)
  // Descarta respostas antigas quando duas buscas se cruzam
  const pedido = useRef(0)

  const atualizarAlertas = useCallback(() => {
    const atual = ++pedido.current
    // Só o total interessa (RN-51): a página pode ter um item só
    api<Pagina<Alerta>>('/alerts?limite=1')
      .then((pagina) => {
        if (atual === pedido.current) setAtivos(pagina.total)
      })
      // Falha na contagem não atrapalha a página; o número anterior continua
      .catch(() => {})
  }, [])

  useEffect(() => {
    atualizarAlertas()
  }, [pathname, atualizarAlertas])

  const valor = useMemo(() => ({ ativos, atualizarAlertas }), [ativos, atualizarAlertas])
  return <AlertasAtivosContext.Provider value={valor}>{children}</AlertasAtivosContext.Provider>
}
