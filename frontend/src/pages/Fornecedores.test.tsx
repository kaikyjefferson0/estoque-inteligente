// CT-85, CT-86, CT-88 e CT-89 (parte da tela): excluir fornecedor pela lista, só o admin vê o botão,
// o 409 da RN-59 aparece num aviso e a edição envia o PUT com o fornecedor completo (RN-19)
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api/client'
import { AuthContext, type AuthValor } from '../auth/contexto'
import type { Perfil } from '../types/auth'
import type { Fornecedor } from '../types/fornecedor'
import { FornecedorEditarPage } from './FornecedorFormPage'
import { FornecedoresPage } from './FornecedoresPage'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: vi.fn(),
}))

const apiSimulada = vi.mocked(api)

const SEM_PRODUTOS: Fornecedor = { id: 1, nome: 'Distribuidora Sem Produtos', cnpj: null, criado_em: '2026-11-01T10:00:00Z' }
const COM_PRODUTOS: Fornecedor = { id: 2, nome: 'Distribuidora Central', cnpj: '11222333000181', criado_em: '2026-11-01T10:00:00Z' }

afterEach(cleanup)
beforeEach(() => {
  apiSimulada.mockReset()
})

function comAuth(perfil: Perfil, elemento: ReactNode, caminho = '/fornecedores') {
  const auth: AuthValor = {
    usuario: { id: 1, nome: 'Pessoa', email: 'pessoa@exemplo.com.br', perfil, ativo: true, criado_em: '2026-10-29T10:00:00Z', demo: false },
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
        {/* Como no AppLayout: o conteúdo recebe o foco depois de uma exclusão */}
        <main id="conteudo" tabIndex={-1}>
          {elemento}
        </main>
      </AuthContext.Provider>
    </MemoryRouter>,
  )
}

/** Lista com os dois fornecedores; depois de excluir, a lista recarregada vem sem o excluído. */
function simularApi(aoExcluir: (id: number) => Promise<unknown>) {
  let excluidos: number[] = []
  apiSimulada.mockImplementation(async (caminho, opcoes) => {
    const id = Number(caminho.split('/')[2])
    if (opcoes?.method === 'DELETE') {
      await aoExcluir(id)
      excluidos = [...excluidos, id]
      return undefined
    }
    const itens = [SEM_PRODUTOS, COM_PRODUTOS].filter((f) => !excluidos.includes(f.id))
    return { itens, total: itens.length, limite: 50, deslocamento: 0 }
  })
}

describe('Lista de fornecedores: excluir', () => {
  it('o operador não vê o botão Excluir (CT-88)', async () => {
    simularApi(async () => undefined)
    comAuth('operador', <FornecedoresPage />)

    expect(await screen.findByText(SEM_PRODUTOS.nome)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Excluir/ })).toBeNull()
    expect(screen.getAllByRole('link', { name: /^Editar/ })).toHaveLength(2)
  })

  it('o admin confirma no diálogo, o fornecedor some e aparece "Fornecedor excluído" (CT-85)', async () => {
    const aoExcluir = vi.fn().mockResolvedValue(undefined)
    simularApi(aoExcluir)
    const usuario = userEvent.setup()
    comAuth('admin', <FornecedoresPage />)

    await usuario.click(await screen.findByRole('button', { name: `Excluir ${SEM_PRODUTOS.nome}` }))
    const dialogo = screen.getByRole('alertdialog', { name: `Excluir ${SEM_PRODUTOS.nome}?` })
    // Sem confirmar, nada é apagado
    expect(aoExcluir).not.toHaveBeenCalled()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Excluir fornecedor' }))

    expect(await screen.findByRole('status')).toHaveProperty('textContent', `Fornecedor excluído: ${SEM_PRODUTOS.nome}.`)
    // O botão sumiu com o fornecedor: o foco vai para o conteúdo da página
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('conteudo'))
    expect(aoExcluir).toHaveBeenCalledWith(SEM_PRODUTOS.id)
    expect(apiSimulada).toHaveBeenCalledWith(`/suppliers/${SEM_PRODUTOS.id}`, { method: 'DELETE' })
    await vi.waitFor(() => expect(screen.queryByText(SEM_PRODUTOS.nome)).toBeNull())
    expect(screen.getByText(COM_PRODUTOS.nome)).toBeTruthy()
  })

  it('Cancelar fecha o diálogo sem chamar a API', async () => {
    const aoExcluir = vi.fn()
    simularApi(aoExcluir)
    const usuario = userEvent.setup()
    comAuth('admin', <FornecedoresPage />)

    const botao = await screen.findByRole('button', { name: `Excluir ${SEM_PRODUTOS.nome}` })
    await usuario.click(botao)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(aoExcluir).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(document.activeElement).toBe(botao))
  })

  it('o 409 mostra a mensagem da API num aviso e a lista continua (CT-86)', async () => {
    const mensagem = 'Este fornecedor tem 3 produto(s) vinculado(s) e não pode ser excluído.'
    simularApi(async () => {
      throw new ApiError(409, mensagem)
    })
    const usuario = userEvent.setup()
    comAuth('admin', <FornecedoresPage />)

    await usuario.click(await screen.findByRole('button', { name: `Excluir ${COM_PRODUTOS.nome}` }))
    await usuario.click(screen.getByRole('button', { name: 'Excluir fornecedor' }))

    // A mensagem da API vem inteira, com o nome de quem e o que fazer em volta
    const aviso = await screen.findByRole('alert')
    expect(aviso.textContent).toBe(
      `Não foi possível excluir ${COM_PRODUTOS.nome}. ${mensagem} Para excluir, troque o fornecedor desses produtos ou deixe-os sem fornecedor.`,
    )
    expect(screen.queryByRole('alertdialog')).toBeNull()
    // O aviso fica no topo: o foco vai até ele, para quem rolou a lista não perder a mensagem
    await vi.waitFor(() => expect(aviso.parentElement?.contains(document.activeElement)).toBe(true))
    expect(screen.getByText(COM_PRODUTOS.nome)).toBeTruthy()
    expect(screen.getByText(SEM_PRODUTOS.nome)).toBeTruthy()
  })
})

describe('Editar fornecedor: PUT com o fornecedor completo (CT-89)', () => {
  function abrirEdicao() {
    comAuth(
      'operador',
      <Routes>
        <Route path="/fornecedores/:id/editar" element={<FornecedorEditarPage />} />
        <Route path="/fornecedores" element={<p>Lista</p>} />
      </Routes>,
      `/fornecedores/${COM_PRODUTOS.id}/editar`,
    )
  }

  it('mudando só o nome, envia nome e CNPJ', async () => {
    apiSimulada.mockImplementation(async (_caminho, opcoes) => (opcoes?.method === 'PUT' ? opcoes.body : COM_PRODUTOS))
    const usuario = userEvent.setup()
    abrirEdicao()

    const nome = await screen.findByLabelText('Nome')
    await usuario.clear(nome)
    await usuario.type(nome, 'Distribuidora Nova')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(apiSimulada).toHaveBeenCalledWith(`/suppliers/${COM_PRODUTOS.id}`, {
      method: 'PUT',
      body: { nome: 'Distribuidora Nova', cnpj: '11222333000181' },
    })
    expect(await screen.findByText('Lista')).toBeTruthy()
  })

  it('CNPJ apagado vai como null', async () => {
    apiSimulada.mockImplementation(async (_caminho, opcoes) => (opcoes?.method === 'PUT' ? opcoes.body : COM_PRODUTOS))
    const usuario = userEvent.setup()
    abrirEdicao()

    await usuario.clear(await screen.findByLabelText('CNPJ (opcional)'))
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(apiSimulada).toHaveBeenCalledWith(`/suppliers/${COM_PRODUTOS.id}`, {
      method: 'PUT',
      body: { nome: COM_PRODUTOS.nome, cnpj: null },
    })
  })
})
