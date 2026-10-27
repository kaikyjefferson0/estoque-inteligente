import { useCallback, useRef, useState } from 'react'
import { ApiError, api, mensagemDeErro } from '../api/client'
import type { Produto, SaldoProduto } from '../types/produto'

export interface ProdutoLido {
  produto: Produto
  saldo: SaldoProduto
  // Muda a cada leitura, mesmo do mesmo produto: serve de key para recomeçar o formulário
  vez: number
}

/** Estado da leitura por código de barras, com a busca exata GET /products/by-barcode/{codigo}. */
export function useLeituraDeCodigo() {
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  // Código lido não existe: oferece o cadastro já com ele preenchido
  const [naoEncontrado, setNaoEncontrado] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [lido, setLido] = useState<ProdutoLido | null>(null)
  const campo = useRef<HTMLInputElement>(null)
  // Descarta respostas de leituras antigas (ex.: leitor disparou dois códigos seguidos)
  const leitura = useRef(0)

  const buscar = useCallback(async (valor: string) => {
    const atual = ++leitura.current
    const termo = valor.trim()
    setLido(null)
    setNaoEncontrado(null)
    if (!termo) {
      setErro('Leia ou digite o código de barras.')
      campo.current?.focus()
      return
    }
    setErro(null)
    setBuscando(true)
    try {
      let produto: Produto
      try {
        produto = await api<Produto>(`/products/by-barcode/${encodeURIComponent(termo)}`)
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) throw e
        if (atual !== leitura.current) return
        setErro(`Nenhum produto com o código ${termo}. Confira o código ou cadastre o produto.`)
        setNaoEncontrado(termo)
        campo.current?.select()
        return
      }
      if (atual !== leitura.current) return
      const saldo = await api<SaldoProduto>(`/products/${produto.id}/stock`)
      if (atual !== leitura.current) return
      setLido({ produto, saldo, vez: atual })
    } catch (e) {
      if (atual !== leitura.current) return
      setErro(mensagemDeErro(e))
      campo.current?.focus()
    } finally {
      if (atual === leitura.current) setBuscando(false)
    }
  }, [])

  /** Limpa tudo e devolve o cursor ao código, pronto para o próximo item. */
  const recomecar = useCallback(() => {
    leitura.current++
    setCodigo('')
    setErro(null)
    setNaoEncontrado(null)
    setLido(null)
    setBuscando(false)
    campo.current?.focus()
  }, [])

  /** Erro vindo do registro (ex.: 404): volta para o campo de código. */
  const mostrarErro = useCallback((mensagem: string) => {
    leitura.current++
    setLido(null)
    setNaoEncontrado(null)
    setErro(mensagem)
    campo.current?.focus()
    campo.current?.select()
  }, [])

  const mudarCodigo = useCallback((valor: string) => {
    leitura.current++
    setCodigo(valor)
    setErro(null)
    setNaoEncontrado(null)
    setBuscando(false)
    // Código mudou: o produto mostrado não vale mais
    setLido(null)
  }, [])

  // O ref vai separado do estado: o estado é lido na renderização, o ref só em eventos
  const estado = { codigo, erro, naoEncontrado, buscando, lido, buscar, recomecar, mostrarErro, mudarCodigo, setLido }
  return [estado, campo] as const
}

export type Leitura = ReturnType<typeof useLeituraDeCodigo>[0]
