// CT-82 / RN-04: o cadastro aberto por "Cadastrar produto com este código" (?codigo=) e o envio do
// formulário usam o código de barras sem espaços
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { ProdutoEditarPage, ProdutoNovoPage } from './ProdutoFormPage'

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

// CT-94 / RN-60: o preço digitado no formato brasileiro vai para a API como texto ("12.50")
describe('Cadastrar e editar produto: preço', () => {
  async function preencherObrigatorios(usuario: ReturnType<typeof userEvent.setup>) {
    await usuario.type(screen.getByLabelText('Nome'), 'Leite integral 1 L')
    await usuario.type(screen.getByLabelText('Código de barras'), '7891000000011')
    await usuario.type(screen.getByLabelText('Estoque mínimo'), '10')
  }

  it.each([
    ['12,50', '12.50'],
    ['1.234,56', '1234.56'],
    ['0,10', '0.10'],
  ])('envia "%s" como o texto "%s", nunca como número', async (digitado, enviado) => {
    apiSimulada.mockResolvedValue({ id: 99 })
    const usuario = userEvent.setup()
    abrirCadastro()

    await preencherObrigatorios(usuario)
    await usuario.type(screen.getByLabelText('Preço (opcional)'), digitado)
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(apiSimulada).toHaveBeenCalledWith('/products', { body: expect.objectContaining({ preco: enviado }) })
  })

  it('sem preço, envia null', async () => {
    apiSimulada.mockResolvedValue({ id: 99 })
    const usuario = userEvent.setup()
    abrirCadastro()

    await preencherObrigatorios(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(apiSimulada).toHaveBeenCalledWith('/products', { body: expect.objectContaining({ preco: null }) })
  })

  it.each([
    ['-1', 'O preço não pode ser negativo. Use 0 ou mais, ou deixe vazio.'],
    ['12,345', 'Use no máximo 2 casas depois da vírgula. Exemplo: 12,50.'],
    ['12.345', 'Ficou ambíguo. Use vírgula nos centavos (12,34) ou escreva sem ponto (12345).'],
    ['doze', 'Use só números, com vírgula nos centavos. Exemplo: 12,50.'],
  ])('com "%s", mostra o erro no campo, põe o foco nele e não envia', async (digitado, mensagem) => {
    const usuario = userEvent.setup()
    abrirCadastro()

    await preencherObrigatorios(usuario)
    const campo = screen.getByLabelText('Preço (opcional)')
    await usuario.type(campo, digitado)
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar produto' }))

    expect(apiSimulada).not.toHaveBeenCalled()
    expect(campo).toHaveProperty('ariaInvalid', 'true')
    expect(document.activeElement).toBe(campo)
    expect(screen.getByText(mensagem)).toBeTruthy()

    // O erro some assim que a pessoa edita
    await usuario.clear(campo)
    expect(screen.queryByText(mensagem)).toBeNull()
  })

  function abrirEdicao(preco: string | null) {
    const produto = {
      id: 5,
      nome: 'Detergente neutro 500 ml',
      codigo_barras: '7891000000102',
      estoque_minimo: 5,
      controla_validade: false,
      dias_alerta_validade: null,
      fornecedor_id: null,
      fornecedor_nome: null,
      preco,
      criado_em: '2026-11-20T12:00:00Z',
    }
    apiSimulada.mockImplementation(async (caminho: string, opcoes?: { method?: string }) => {
      if (opcoes?.method === 'PATCH') return produto
      if (caminho === '/products/5/stock') return { lotes: [], saldo_fisico: 0, saldo_disponivel: 0 }
      return produto
    })
    render(
      <MemoryRouter initialEntries={['/produtos/5/editar']}>
        <Routes>
          <Route path="/produtos/:id/editar" element={<ProdutoEditarPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  function corpoDoPatch() {
    const chamada = apiSimulada.mock.calls.find(([, opcoes]) => opcoes?.method === 'PATCH')
    return chamada?.[1]?.body
  }

  it('na edição, mostra o preço salvo com vírgula e apagar envia null', async () => {
    const usuario = userEvent.setup()
    abrirEdicao('1234.50')

    const campo = await screen.findByLabelText('Preço (opcional)')
    expect(campo).toHaveProperty('value', '1.234,50')

    await usuario.clear(campo)
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(corpoDoPatch()).toEqual({ preco: null })
  })

  it('na edição, trocar o preço envia só ele', async () => {
    const usuario = userEvent.setup()
    abrirEdicao('12.50')

    const campo = await screen.findByLabelText('Preço (opcional)')
    await usuario.clear(campo)
    await usuario.type(campo, '13,00')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(corpoDoPatch()).toEqual({ preco: '13.00' })
  })

  it('na edição, o mesmo preço escrito de outro jeito não é enviado', async () => {
    const usuario = userEvent.setup()
    abrirEdicao('12.50')

    const campo = await screen.findByLabelText('Preço (opcional)')
    await usuario.clear(campo)
    await usuario.type(campo, '12,5')
    await usuario.type(screen.getByLabelText('Estoque mínimo'), '0')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    // "12,5" é o mesmo 12.50 salvo: só o mínimo mudou (5 -> 50)
    expect(corpoDoPatch()).toEqual({ estoque_minimo: 50 })
  })

  it('na edição, um produto sem preço ganha preço', async () => {
    const usuario = userEvent.setup()
    abrirEdicao(null)

    const campo = await screen.findByLabelText('Preço (opcional)')
    expect(campo).toHaveProperty('value', '')
    await usuario.type(campo, '2,59')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(corpoDoPatch()).toEqual({ preco: '2.59' })
  })
})
