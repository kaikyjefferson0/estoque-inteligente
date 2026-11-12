// CT-82 / RN-04: a leitura busca o código sem espaços, do jeito que ele é salvo. Colado da tela,
// o código vem com uma quebra de linha (ou um espaço) entre os grupos.
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/client'
import type { Produto, SaldoProduto } from '../types/produto'
import { useLeituraDeCodigo } from './useLeituraDeCodigo'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: vi.fn(),
}))

const apiSimulada = vi.mocked(api)

const PRODUTO: Produto = {
  id: 14,
  nome: 'Leite integral 1 L',
  codigo_barras: '30373543',
  estoque_minimo: 10,
  controla_validade: false,
  dias_alerta_validade: null,
  fornecedor_id: null,
  fornecedor_nome: null,
  criado_em: '2026-11-11T12:00:00Z',
}
const SALDO: SaldoProduto = { produto_id: 14, saldo_fisico: 5, saldo_disponivel: 5, lotes: [] }

async function responder(caminho: string): Promise<unknown> {
  return caminho.startsWith('/products/by-barcode/') ? PRODUTO : SALDO
}

function buscasPeloCodigo(): string[] {
  return apiSimulada.mock.calls.map(([caminho]) => caminho).filter((c) => c.startsWith('/products/by-barcode/'))
}

beforeEach(() => {
  apiSimulada.mockReset()
})

describe('useLeituraDeCodigo: busca pelo código de barras', () => {
  it.each([
    ['com a quebra de linha da cópia', '3037\r\n3543'],
    ['com espaço entre os grupos', '3037 3543'],
    ['com espaço inseparável', '3037 3543'],
  ])('busca o código colado %s só com os dígitos', async (_, colado) => {
    apiSimulada.mockImplementation(responder as typeof api)
    const { result } = renderHook(() => useLeituraDeCodigo())

    await act(() => result.current[0].buscar(colado))

    expect(buscasPeloCodigo()).toEqual(['/products/by-barcode/30373543'])
    expect(result.current[0].lido?.produto.id).toBe(14)
    expect(result.current[0].erro).toBeNull()
  })

  it('código não encontrado: a mensagem e o link de cadastro levam o código sem espaços', async () => {
    apiSimulada.mockRejectedValue(new ApiError(404, 'Produto não encontrado.'))
    const { result } = renderHook(() => useLeituraDeCodigo())

    await act(() => result.current[0].buscar(' 3037\n3543 '))

    expect(buscasPeloCodigo()).toEqual(['/products/by-barcode/30373543'])
    expect(result.current[0].naoEncontrado).toBe('30373543')
    expect(result.current[0].erro).toBe('Nenhum produto com o código 30373543. Confira o código ou cadastre o produto.')
  })

  it('só espaços não vira busca: pede o código', async () => {
    const { result } = renderHook(() => useLeituraDeCodigo())

    await act(() => result.current[0].buscar('  \r\n'))

    expect(apiSimulada).not.toHaveBeenCalled()
    expect(result.current[0].erro).toBe('Leia ou digite o código de barras.')
  })
})
