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
