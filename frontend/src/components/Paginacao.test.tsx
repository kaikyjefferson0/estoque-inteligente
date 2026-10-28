import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { descreverIntervalo, ultimoDeslocamento } from '../utils/paginacao'
import { Paginacao } from './Paginacao'

afterEach(cleanup)

function Lista({ total, limite = 50 }: { total: number; limite?: number }) {
  const [deslocamento, setDeslocamento] = useState(0)
  return <Paginacao total={total} limite={limite} deslocamento={deslocamento} aoMudar={setDeslocamento} nomeDaLista="produtos" />
}

describe('texto da faixa', () => {
  it('"1 a 50 de 312"', () => {
    expect(descreverIntervalo(312, 50, 0)).toBe('1 a 50 de 312')
    expect(descreverIntervalo(312, 50, 300)).toBe('301 a 312 de 312')
  })

  it('usa o separador de milhar brasileiro', () => {
    expect(descreverIntervalo(1312, 50, 1250)).toBe('1.251 a 1.300 de 1.312')
  })

  it('última página com itens', () => {
    expect(ultimoDeslocamento(312, 50)).toBe(300)
    expect(ultimoDeslocamento(300, 50)).toBe(250)
    expect(ultimoDeslocamento(0, 50)).toBe(0)
  })
})

describe('<Paginacao>', () => {
  it('mostra a faixa e bloqueia "Anterior" na primeira página', () => {
    render(<Lista total={312} />)
    expect(screen.getByRole('navigation', { name: 'Páginas de produtos' })).toBeTruthy()
    expect(screen.getByText('1 a 50 de 312')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Anterior' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Próxima' }).hasAttribute('disabled')).toBe(false)
  })

  it('"Próxima" e "Anterior" andam uma página', async () => {
    const usuario = userEvent.setup()
    render(<Lista total={312} />)
    await usuario.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(screen.getByText('51 a 100 de 312')).toBeTruthy()
    await usuario.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(screen.getByText('1 a 50 de 312')).toBeTruthy()
  })

  it('na última página, "Próxima" bloqueia e o foco passa para "Anterior"', async () => {
    const usuario = userEvent.setup()
    render(<Lista total={120} />)
    await usuario.click(screen.getByRole('button', { name: 'Próxima' }))
    await usuario.click(screen.getByRole('button', { name: 'Próxima' }))
    expect(screen.getByText('101 a 120 de 120')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Próxima' }).hasAttribute('disabled')).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Anterior' }))
  })

  it('com uma página só, mostra a faixa sem os botões', () => {
    render(<Lista total={3} />)
    expect(screen.getByText('1 a 3 de 3')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('lista vazia não mostra nada', () => {
    const { container } = render(<Lista total={0} />)
    expect(container.innerHTML).toBe('')
  })

  it('página além do total (a lista encolheu) vai para a última com itens', () => {
    const aoMudar = vi.fn()
    render(<Paginacao total={60} limite={50} deslocamento={100} aoMudar={aoMudar} nomeDaLista="alertas" />)
    expect(aoMudar).toHaveBeenCalledWith(50)
  })

  it('a faixa é anunciada ao leitor de tela quando muda', () => {
    render(<Lista total={312} />)
    expect(screen.getByText('1 a 50 de 312').getAttribute('aria-live')).toBe('polite')
  })
})
