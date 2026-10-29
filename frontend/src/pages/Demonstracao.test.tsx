// CT-74: botão "Entrar como demonstração" só com VITE_DEMO, e "Minha conta" da conta de demonstração
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthValor } from '../auth/contexto'
import { lerContaDemo } from '../auth/demo'
import type { Usuario } from '../types/auth'
import { LoginPage } from './LoginPage'
import { MinhaContaPage } from './MinhaContaPage'

afterEach(cleanup)

const CONTA = { email: 'demo@exemplo.com.br', senha: 'senha-da-demo-123' }

function usuario(demo: boolean): Usuario {
  return {
    id: 2,
    nome: 'Visitante da demonstração',
    email: CONTA.email,
    perfil: 'operador',
    ativo: true,
    criado_em: '2026-10-29T10:00:00Z',
    demo,
  }
}

function comAuth(elemento: ReactNode, valor: Partial<AuthValor> = {}) {
  const auth: AuthValor = {
    usuario: null,
    carregando: false,
    entrar: vi.fn().mockResolvedValue(undefined),
    sair: vi.fn(),
    sairAposTrocarSenha: vi.fn(),
    senhaTrocada: false,
    atualizarUsuario: vi.fn(),
    ...valor,
  }
  render(
    <MemoryRouter>
      <AuthContext.Provider value={auth}>{elemento}</AuthContext.Provider>
    </MemoryRouter>,
  )
  return auth
}

describe('lerContaDemo', () => {
  it('só liga com VITE_DEMO=true e a conta completa', () => {
    const conta = { VITE_DEMO_EMAIL: CONTA.email, VITE_DEMO_SENHA: CONTA.senha }
    expect(lerContaDemo({ ...conta, VITE_DEMO: 'true' })).toEqual(CONTA)
    expect(lerContaDemo({ ...conta, VITE_DEMO: ' TRUE ' })).toEqual(CONTA)
    expect(lerContaDemo(conta)).toBeNull()
    expect(lerContaDemo({ ...conta, VITE_DEMO: 'false' })).toBeNull()
    expect(lerContaDemo({ VITE_DEMO: 'true', VITE_DEMO_EMAIL: CONTA.email })).toBeNull()
    expect(lerContaDemo({ VITE_DEMO: 'true', VITE_DEMO_SENHA: CONTA.senha })).toBeNull()
  })
})

describe('login', () => {
  it('sem o modo de demonstração, não mostra o botão', () => {
    comAuth(<LoginPage contaDemo={null} />)
    expect(screen.queryByRole('button', { name: 'Entrar como demonstração' })).toBeNull()
  })

  it('com o modo de demonstração, entra com a conta de demonstração', async () => {
    const auth = comAuth(<LoginPage contaDemo={CONTA} />)
    await userEvent.click(screen.getByRole('button', { name: 'Entrar como demonstração' }))
    expect(auth.entrar).toHaveBeenCalledWith(CONTA.email, CONTA.senha)
  })
})

describe('Minha conta', () => {
  it('conta de demonstração: sem troca de senha e com o motivo', () => {
    comAuth(<MinhaContaPage />, { usuario: usuario(true) })
    expect(screen.queryByLabelText('Senha atual')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Trocar senha' })).toBeNull()
    expect(screen.getByText(/a senha dela não pode ser trocada/)).toBeTruthy()
  })

  it('conta comum: continua com a troca de senha', () => {
    comAuth(<MinhaContaPage />, { usuario: usuario(false) })
    expect(screen.getByLabelText('Senha atual')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Trocar senha' })).toBeTruthy()
  })
})
