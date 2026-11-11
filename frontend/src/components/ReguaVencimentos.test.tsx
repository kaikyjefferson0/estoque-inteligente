// Régua de vencimentos do Painel: o que o leitor de tela recebe e os estados de vazio e erro.
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Vencimentos } from '../alertas/useVencimentos'
import type { Alerta } from '../types/alerta'
import { ReguaVencimentos } from './ReguaVencimentos'

afterEach(cleanup)

// 12:00 de 11/11/2026 em Brasília
const AGORA = new Date('2026-11-11T15:00:00Z')

function alerta(id: number, tipo: Alerta['tipo'], validade: string): Alerta {
  return { id, tipo, produto_id: 1, produto_nome: 'Iogurte', lote_id: id, validade, criado_em: AGORA.toISOString(), resolvido_em: null }
}

function desenhar(parcial: Partial<Vencimentos>) {
  const vencimentos: Vencimentos = { alertas: [], erro: null, carregando: false, atualizadoEm: AGORA, recarregar: vi.fn(), ...parcial }
  render(
    <MemoryRouter>
      <ReguaVencimentos vencimentos={vencimentos} />
    </MemoryRouter>,
  )
  return vencimentos
}

describe('ReguaVencimentos', () => {
  it('escreve os vencidos e diz ao leitor de tela só os dias com vencimento', () => {
    desenhar({
      alertas: [
        alerta(1, 'vencido', '2026-11-09'),
        alerta(2, 'vencimento_proximo', '2026-11-11'),
        alerta(3, 'vencimento_proximo', '2026-11-14'),
        alerta(4, 'vencimento_proximo', '2026-11-14'),
        alerta(5, 'vencimento_proximo', '2027-01-10'),
      ],
    })
    // Situação escrita, não só pela cor (RN-15)
    expect(screen.getByText('1 lote vencido')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver vencidos' }).getAttribute('href')).toBe('/alertas?tipo=vencido')

    const lista = screen.getAllByRole('list').find((l) => l.tagName === 'UL')!
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Hoje, quarta-feira, 11 de novembro: 1 lote vence',
      'sábado, 14 de novembro: 2 lotes vencem',
    ])
    // A grade visual não entra na árvore de acessibilidade
    expect(document.querySelector('ol')?.getAttribute('aria-hidden')).toBe('true')

    expect(screen.getByText('Mais 1 lote vence depois de 01/12.')).toBeTruthy()
    // Nome diferente do "Ver alertas" do Painel, que leva a outro lugar (WCAG 3.2.4)
    expect(screen.getByRole('link', { name: 'Ver a vencer' }).getAttribute('href')).toBe('/alertas?tipo=vencimento_proximo')

    // A explicação do desenho fica fora do leitor de tela; o resumo continua
    expect(screen.getByText(/Dia circulado/).closest('[aria-hidden]')).not.toBeNull()
    expect(screen.getByText(/3 lotes em 2 dias\./).closest('[aria-hidden]')).toBeNull()
  })

  it('mostra o vazio sem esconder os 21 dias', () => {
    desenhar({ alertas: [] })
    expect(screen.getByText('Nenhum vencimento nos próximos 21 dias.')).toBeTruthy()
    expect(document.querySelectorAll('ol > li')).toHaveLength(21)
    expect(screen.queryByText(/vencido/)).toBeNull()
  })

  it('mostra o erro com "Tentar de novo"', async () => {
    const { recarregar } = desenhar({ alertas: null, atualizadoEm: null, erro: 'Não foi possível carregar.' })
    expect(screen.getByText('Não foi possível carregar.')).toBeTruthy()
    screen.getByRole('button', { name: 'Tentar de novo' }).click()
    expect(recarregar).toHaveBeenCalled()
  })

  it('mostra o carregando antes da primeira resposta', () => {
    desenhar({ alertas: null, atualizadoEm: null, carregando: true })
    expect(screen.getByRole('status').textContent).toContain('Carregando os vencimentos')
  })
})
