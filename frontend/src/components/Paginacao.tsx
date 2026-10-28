import { useEffect, useRef } from 'react'
import { descreverIntervalo, ultimoDeslocamento } from '../utils/paginacao'
import { Botao } from './Botao'

interface PaginacaoProps {
  total: number
  limite: number
  deslocamento: number
  aoMudar: (deslocamento: number) => void
  // Nome da lista para o leitor de tela, por exemplo "produtos"
  nomeDaLista: string
}

/** Componente único de paginação das listas: "Anterior", "Próxima" e "1 a 50 de 312". */
export function Paginacao({ total, limite, deslocamento, aoMudar, nomeDaLista }: PaginacaoProps) {
  const anterior = useRef<HTMLButtonElement>(null)
  const proxima = useRef<HTMLButtonElement>(null)
  // Quem foi clicado pode ficar bloqueado (primeira ou última página); o foco passa para o outro
  const focarDepois = useRef<HTMLButtonElement | null>(null)

  const temAnterior = deslocamento > 0
  const temProxima = deslocamento + limite < total

  // A lista encolheu (ex.: itens resolvidos) e a página pedida ficou vazia: vai para a última com itens
  useEffect(() => {
    if (total > 0 && deslocamento >= total) aoMudar(ultimoDeslocamento(total, limite))
  }, [total, limite, deslocamento, aoMudar])

  useEffect(() => {
    focarDepois.current?.focus()
    focarDepois.current = null
  }, [deslocamento])

  if (total <= 0) return null
  const umaPagina = !temAnterior && !temProxima

  function ir(novo: number, alvoSeBloquear: HTMLButtonElement | null, bloqueia: boolean) {
    if (bloqueia) focarDepois.current = alvoSeBloquear
    aoMudar(novo)
  }

  return (
    <nav className="paginacao" aria-label={`Páginas de ${nomeDaLista}`}>
      <p className="paginacao__texto numero" aria-live="polite">
        {descreverIntervalo(total, limite, deslocamento)}
      </p>
      {!umaPagina && (
        <div className="paginacao__botoes">
          <Botao
            ref={anterior}
            variante="secundaria"
            disabled={!temAnterior}
            onClick={() => ir(Math.max(deslocamento - limite, 0), proxima.current, deslocamento - limite <= 0)}
          >
            Anterior
          </Botao>
          <Botao
            ref={proxima}
            variante="secundaria"
            disabled={!temProxima}
            onClick={() => ir(deslocamento + limite, anterior.current, deslocamento + 2 * limite >= total)}
          >
            Próxima
          </Botao>
        </div>
      )}
    </nav>
  )
}
