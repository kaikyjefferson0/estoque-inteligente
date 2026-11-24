// CT-94 / RN-60 (parte da tela): a lista e o detalhe mostram o preço em reais, ou "Sem preço"
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { AuthContext, type AuthValor } from '../auth/contexto'
import type { Produto } from '../types/produto'
import { ProdutoDetalhePage } from './ProdutoDetalhePage'
import { ProdutosPage } from './ProdutosPage'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: vi.fn(),
}))

const apiSimulada = vi.mocked(api)
// O Intl separa o R$ do número com espaço inseparável
const NBSP = String.fromCharCode(0xa0)

function produto(id: number, nome: string, preco: string | null): Produto {
  return {
    id,
    nome,
    codigo_barras: `789100000010${id}`,
    estoque_minimo: 5,
    controla_validade: false,
    dias_alerta_validade: null,
    fornecedor_id: null,
    fornecedor_nome: null,
    preco,
    criado_em: '2026-11-20T12:00:00Z',
  }
}

const COM_PRECO = produto(1, 'Detergente neutro 500 ml', '1234.50')
const SEM_PRECO = produto(2, 'Sabonete 90 g', null)

afterEach(cleanup)
beforeEach(() => {
  apiSimulada.mockReset()
  apiSimulada.mockImplementation(async (caminho: string) => {
    if (caminho.startsWith('/products?')) return { itens: [COM_PRECO, SEM_PRECO], total: 2, limite: 50, deslocamento: 0 }
    if (caminho === '/products/1') return COM_PRECO
    if (caminho === '/products/2') return SEM_PRECO
    if (caminho.endsWith('/stock')) return { produto_id: 1, saldo_fisico: 0, saldo_disponivel: 0, lotes: [] }
    return { itens: [], total: 0, limite: 20, deslocamento: 0 } // histórico
  })
})

function abrir(caminho: string, pagina: ReactNode) {
  const auth: AuthValor = {
    usuario: { id: 1, nome: 'Pessoa', email: 'pessoa@exemplo.com.br', perfil: 'operador', ativo: true, criado_em: '2026-10-29T10:00:00Z', demo: false },
    carregando: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    sairAposTrocarSenha: vi.fn(),
    senhaTrocada: false,
    atualizarUsuario: vi.fn(),
  }
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route path="/produtos" element={pagina} />
          <Route path="/produtos/:id" element={pagina} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

describe('Lista de produtos: preço', () => {
  it('mostra o preço em reais e "Sem preço" sem preço, na coluna alinhada como os números', async () => {
    abrir('/produtos', <ProdutosPage />)

    expect(await screen.findByRole('columnheader', { name: 'Preço' })).toBeTruthy()
    const [, linhaComPreco, linhaSemPreco] = screen.getAllByRole('row')

    const precoCom = linhaComPreco.querySelector('.produtos__preco')!
    expect(precoCom.textContent).toBe(`Preço R$${NBSP}1.234,50`) // o "Preço " só aparece no celular
    expect(precoCom.className).toContain('tabela__numero')
    expect(precoCom.className).toContain('numero')
    expect(precoCom.className).not.toContain('tabela__vazio')

    // Como o "Sem fornecedor": texto suave e sem o rótulo do celular, para não ficar "Preço Sem preço"
    const precoSem = linhaSemPreco.querySelector('.produtos__preco')!
    expect(precoSem.textContent).toBe('Sem preço')
    expect(precoSem.querySelector('.tabela__vazio')?.textContent).toBe('Sem preço')
    expect(precoSem.querySelector('.tabela__rotulo-celular')).toBeNull()
    const fornecedorSem = linhaSemPreco.querySelector('.produtos__fornecedor .tabela__vazio')!
    expect(fornecedorSem.textContent).toBe('Sem fornecedor')
    // Nada de "null", "NaN" ou "R$ 0,00" para quem não tem preço
    expect(within(linhaSemPreco).queryByText(/null|NaN|0,00/)).toBeNull()
  })
})

describe('Detalhe do produto: preço', () => {
  function precoDaFicha() {
    const rotulo = screen.getByText('Preço', { selector: 'dt' })
    return rotulo.nextElementSibling as HTMLElement
  }

  it('mostra o preço em reais', async () => {
    abrir('/produtos/1', <ProdutoDetalhePage />)
    await screen.findByText('Preço', { selector: 'dt' })

    expect(precoDaFicha().textContent).toBe(`R$${NBSP}1.234,50`)
    expect(precoDaFicha().className).toBe('numero')
  })

  it('sem preço, mostra "Sem preço" em texto suave, como o "Sem fornecedor"', async () => {
    abrir('/produtos/2', <ProdutoDetalhePage />)
    await screen.findByText('Preço', { selector: 'dt' })

    expect(precoDaFicha().textContent).toBe('Sem preço')
    expect(precoDaFicha().className).toBe('ficha__vazio')
    const fornecedor = screen.getByText('Fornecedor', { selector: 'dt' }).nextElementSibling!
    expect(fornecedor.className).toBe(precoDaFicha().className)
  })
})
