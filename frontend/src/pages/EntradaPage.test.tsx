// CT-101 / RN-65: a entrada que passaria do máximo do lote é recusada com 422 em texto; a tela mostra a
// mensagem no campo da quantidade, com o foco nele, mesmo num produto que controla validade
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/client'
import { EntradaPage } from './EntradaPage'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: vi.fn(),
}))
vi.mock('../alertas/useAlertasAtivos', () => ({ useAlertasAtivos: () => ({ atualizarAlertas: vi.fn() }) }))

const apiSimulada = vi.mocked(api)

const PRODUTO = {
  id: 7,
  nome: 'Leite integral 1 L',
  codigo_barras: '7891000000011',
  estoque_minimo: 5,
  controla_validade: true,
  dias_alerta_validade: 30,
  fornecedor_id: null,
  fornecedor_nome: null,
  preco: null,
  criado_em: '2026-11-20T12:00:00Z',
}

afterEach(cleanup)
beforeEach(() => {
  apiSimulada.mockReset()
})

async function enviarEntrada(quantidade: string, recusa: ApiError) {
  apiSimulada.mockImplementation(async (caminho: string) => {
    if (caminho === '/stock/entries') throw recusa
    if (caminho === '/products/7/stock') return { produto_id: 7, saldo_fisico: 0, saldo_disponivel: 0, lotes: [] }
    return PRODUTO
  })
  const usuario = userEvent.setup()
  render(
    <MemoryRouter>
      <EntradaPage />
    </MemoryRouter>,
  )
  await usuario.type(screen.getByLabelText('Código de barras'), '7891000000011{Enter}')
  await usuario.type(await screen.findByLabelText('Quantidade'), quantidade)
  await usuario.type(screen.getByLabelText('Validade'), '31122099')
  await usuario.click(screen.getByRole('button', { name: 'Registrar entrada' }))
  return usuario
}

describe('Entrada recusada pelo máximo do lote (RN-65)', () => {
  it.each([
    'O lote tem 2000000000 unidades e vai até 2147483647: cabem mais 147483647 unidades. Informe até 147483647.',
    'O lote já tem 2147483647 unidades, o máximo de um lote, e não cabe mais nenhuma. Confira a quantidade e o saldo do lote.',
  ])('mostra "%s" na quantidade', async (mensagem) => {
    const usuario = await enviarEntrada('2000000000', new ApiError(422, mensagem))

    const quantidade = screen.getByLabelText('Quantidade')
    expect(await screen.findByText(mensagem)).toBeTruthy()
    expect(quantidade).toHaveProperty('ariaInvalid', 'true')
    expect(screen.getByLabelText('Validade').getAttribute('aria-invalid')).toBeNull()
    expect(document.activeElement).toBe(quantidade)

    // O erro some assim que a pessoa edita
    await usuario.clear(quantidade)
    expect(screen.queryByText(mensagem)).toBeNull()
  })

  it('a recusa da validade continua no campo da validade', async () => {
    const mensagem = 'Esta validade já passou e produto vencido não entra no estoque. Informe uma data a partir de hoje.'
    await enviarEntrada('10', new ApiError(422, mensagem))

    expect(await screen.findByText(mensagem)).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Validade'))
  })
})
