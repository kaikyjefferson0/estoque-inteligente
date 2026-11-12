// CT-82 / RN-04: o cadastro aberto por "Cadastrar produto com este código" (?codigo=) e o envio do
// formulário usam o código de barras sem espaços
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { ProdutoNovoPage } from './ProdutoFormPage'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: vi.fn(),
}))

const apiSimulada = vi.mocked(api)

afterEach(cleanup)
beforeEach(() => {
  apiSimulada.mockReset()
})

function abrirCadastro(busca = '') {
  render(
    <MemoryRouter initialEntries={[`/produtos/novo${busca}`]}>
      <ProdutoNovoPage />
    </MemoryRouter>,
  )
}

describe('Cadastrar produto: código de barras sem espaços', () => {
  it('o código que vem no endereço (?codigo=) chega ao campo sem os espaços', () => {
    // Espaço, não quebra de linha: o próprio campo tiraria a quebra, e o teste passaria sem a correção
    abrirCadastro(`?codigo=${encodeURIComponent('3037 3543')}`)

    expect(screen.getByLabelText('Código de barras')).toHaveProperty('value', '30373543')
  })

  it('envia o código digitado com espaços só com os dígitos', async () => {
    apiSimulada.mockResolvedValue({ id: 99 })
    const usuario = userEvent.setup()
    abrirCadastro()

    await usuario.type(screen.getByLabelText('Nome'), 'Leite integral 1 L')
    await usuario.type(screen.getByLabelText('Código de barras'), '3037 3543')
    await usuario.type(screen.getByLabelText('Estoque mínimo'), '10')
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(apiSimulada).toHaveBeenCalledWith('/products', {
      body: expect.objectContaining({ codigo_barras: '30373543' }),
    })
  })
})
