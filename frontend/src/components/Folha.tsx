import { partesDoDia } from '../utils/formato'

/** Marca do sistema: a folha da folhinha com o dia de hoje (em Brasília) e o mês. */
export function FolhaMarca() {
  const { dia, mesCurto } = partesDoDia()
  return (
    <span className="folha-marca" aria-hidden>
      <span className="folha-marca__dia numeral">{dia}</span>
      <span className="folha-marca__mes">{mesCurto}</span>
    </span>
  )
}

/**
 * Mini-folha com o dia de uma movimentação (o `criado_em` dela, em Brasília), à esquerda da linha
 * nas últimas movimentações e no histórico. É só visual: a data e a hora completas continuam
 * escritas na etiqueta "Em", que o leitor de tela lê e a cópia leva.
 */
export function FolhaDaData({ iso, className }: { iso: string; className?: string }) {
  const { dia, mesCurto } = partesDoDia(new Date(iso))
  return (
    <span
      aria-hidden
      className={`flex w-folha-data shrink-0 flex-col items-center rounded-p border-x border-b border-x-borda border-b-borda border-t-picote bg-superficie py-esp-1 leading-numero text-texto ${className ?? ''}`}
    >
      <span className="numeral text-fs-4">{dia}</span>
      <span className="text-fs-1 font-medio text-texto-suave">{mesCurto}</span>
    </span>
  )
}

/** Folha do dia no login: o calendário do balcão, com a regra de quem vence hoje. */
export function FolhaDoDia() {
  const { dia, mes, ano, diaDaSemana } = partesDoDia()
  return (
    <aside className="folha-do-dia" aria-label="Folha de hoje">
      <span className="folha-do-dia__argola" aria-hidden />
      <p className="folha-do-dia__mes">
        <span>{mes}</span>
        <span className="numero">{ano}</span>
      </p>
      <p className="folha-do-dia__dia numeral">{dia}</p>
      <p className="folha-do-dia__semana">{diaDaSemana}</p>
      {/* RN-36: o lote que vence hoje ainda pode sair */}
      <p className="folha-do-dia__nota">Um lote que vence hoje ainda pode sair. Amanhã, não.</p>
      <p className="folha-do-dia__rodape">
        <span className="folha-do-dia__nome">Estoque Inteligente</span>
        <span>Lotes, validade e saldo</span>
      </p>
    </aside>
  )
}
