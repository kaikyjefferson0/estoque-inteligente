import type { ReactNode } from 'react'
import { semQuebraNaUnidade } from '../utils/formato'

/** Nome numa lista: até duas linhas, quebrando só entre palavras e com reticências; o nome
 *  inteiro fica no title (mouse) e na tela de detalhe. Número e unidade nunca se separam. */
export function NomeEmLista({ nome, className }: { nome: string; className?: string }) {
  return (
    <span className={['nome-em-lista', className].filter(Boolean).join(' ')} title={nome}>
      {semQuebraNaUnidade(nome)}
    </span>
  )
}

export interface Metadado {
  // Lido pelo leitor de tela e levado na cópia, mesmo quando não aparece
  rotulo: string
  valor: ReactNode
  rotuloVisivel?: boolean
  className?: string
}

/** Metadados de um item de lista (tipo, validade, tempo, código, saldo), abaixo do nome, como
 *  etiquetas. Lista de definição: cada rótulo e valor é um bloco próprio, então a cópia e o
 *  leitor de tela separam as palavras (um rótulo oculto dentro da mesma linha gruda na cópia). */
export function Metadados({ itens, className }: { itens: (Metadado | false | null | undefined)[]; className?: string }) {
  return (
    <dl className={['metadados', className].filter(Boolean).join(' ')}>
      {itens.filter((item): item is Metadado => Boolean(item)).map((item) => (
        <div key={item.rotulo} className={['metadado', item.className].filter(Boolean).join(' ')}>
          <dt className={item.rotuloVisivel ? 'metadado__rotulo' : 'visualmente-oculto'}>{item.rotulo}</dt>
          <dd className="metadado__valor">{item.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
