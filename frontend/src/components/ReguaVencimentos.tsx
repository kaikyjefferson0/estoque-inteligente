import { Link } from 'react-router-dom'
import type { Vencimentos } from '../alertas/useVencimentos'
import { formatarData, formatarNumero, plural } from '../utils/formato'
import { DIAS_DA_REGUA, montarRegua, type DiaDaRegua } from '../utils/vencimentos'
import { Carregando, ErroEstado } from './Estados'
import { SinalSituacao } from './SinalSituacao'

/** "01/12" a partir de "2026-12-01" */
function diaEMes(data: string): string {
  return formatarData(data).slice(0, 5)
}

function lotes(n: number): string {
  return `${formatarNumero(n)} ${plural(n, 'lote', 'lotes')}`
}

// Espaço inseparável: guarda a altura de uma linha vazia, para os dias da mesma linha alinharem
const VAZIO = String.fromCharCode(160)
const DIAS_DA_SEMANA = 7

// Hoje em placa preta; dia com vencimento circulado a tinta; os outros, calmos. A caixa tem largura
// máxima, para o circulado ficar quase quadrado em qualquer largura e dias vizinhos não se colarem.
// Hoje com vencimento leva a placa e, dentro dela, o circulado em branco: a legenda continua valendo
function classesDoDia({ hoje, lotes: n }: DiaDaRegua): string {
  const base =
    'numeral flex min-h-dia-regua w-full max-w-dia-regua items-center justify-center rounded-p border-circulado text-fs-4'
  if (hoje) return `${base} border-texto bg-texto text-texto-inverso ${n > 0 ? 'circulado-na-placa' : ''}`
  if (n > 0) return `${base} border-texto text-texto`
  return `${base} border-transparent text-texto-suave`
}

interface Linhas {
  // A semana (linha da folha do mês) tem a virada do mês ou algum vencimento
  mesNaSemana: boolean
  lotesNaSemana: boolean
  // Algum vencimento nos 21 dias (a linha das quantidades só existe se houver)
  lotesNaRegua: boolean
}

function Dia({ dia, linhas }: { dia: DiaDaRegua; linhas: Linhas }) {
  // Na folha do mês, a linha do mês e a das quantidades só ocupam espaço na semana que as usa
  const classeMes = linhas.mesNaSemana ? '' : 'regua-estreita:hidden'
  const classeLotes = !linhas.lotesNaRegua ? 'hidden' : linhas.lotesNaSemana ? '' : 'regua-estreita:hidden'
  return (
    <li className="flex min-w-esp-0 flex-col items-center gap-esp-1 py-esp-2 regua-estreita:py-esp-1">
      <span className={`text-fs-1 leading-numero font-medio text-texto ${classeMes}`}>{dia.mes ?? VAZIO}</span>
      <span className="text-fs-1 leading-numero text-texto-suave regua-estreita:hidden">
        {dia.hoje ? 'hoje' : dia.semana}
      </span>
      <span className={classesDoDia(dia)}>{dia.dia}</span>
      <span className={`numeral text-fs-3 text-atencao-texto ${classeLotes}`}>
        {dia.lotes > 0 ? formatarNumero(dia.lotes) : VAZIO}
      </span>
    </li>
  )
}

interface Props {
  vencimentos: Vencimentos
}

/**
 * Régua de vencimentos do Painel: os 21 dias a partir de hoje (em Brasília), com os dias em que
 * vencem lotes em alerta (RN-14) circulados e a quantidade de lotes embaixo. Os vencidos (RN-15)
 * vêm antes, na cor crítica e escritos. Numa largura estreita, a régua vira a folha do mês.
 */
export function ReguaVencimentos({ vencimentos }: Props) {
  const { alertas, erro, carregando, atualizadoEm, recarregar } = vencimentos
  // O "hoje" da régua é o da resposta (chegam juntos), como a hora no subtítulo do Painel
  const regua = alertas && atualizadoEm ? montarRegua(alertas, atualizadoEm) : null
  const comVencimento = regua?.dias.filter((d) => d.lotes > 0) ?? []
  // Dia de exemplo da legenda: o primeiro com vencimento fora de hoje (hoje tem a placa preta)
  const exemplo = comVencimento.find((d) => !d.hoje) ?? comVencimento[0]

  function linhasDa(indice: number): Linhas {
    const inicio = Math.floor(indice / DIAS_DA_SEMANA) * DIAS_DA_SEMANA
    const semana = regua!.dias.slice(inicio, inicio + DIAS_DA_SEMANA)
    return {
      mesNaSemana: semana.some((d) => d.mes !== null),
      lotesNaSemana: semana.some((d) => d.lotes > 0),
      lotesNaRegua: regua!.lotesNaRegua > 0,
    }
  }

  return (
    <section aria-labelledby="titulo-vencimentos" className="@container flex flex-col gap-esp-3">
      <div className="flex flex-col gap-esp-1">
        <h2 id="titulo-vencimentos">Vencimentos</h2>
        <p className="text-fs-2 text-texto-suave">
          {regua
            ? `Próximos ${DIAS_DA_REGUA} dias, até ${diaEMes(regua.ultimoDia)}, pelos alertas ativos`
            : `Próximos ${DIAS_DA_REGUA} dias, pelos alertas ativos`}
        </p>
      </div>

      {!regua && carregando && <Carregando texto="Carregando os vencimentos…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}

      {regua && (
        <div className="flex flex-col gap-esp-3" aria-busy={carregando}>
          {/* RN-15: os vencidos antes da régua, escritos e na cor crítica */}
          {regua.vencidos > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-x-esp-4">
              <SinalSituacao situacao="critico">
                {regua.vencidos === 1 ? '1 lote vencido' : `${lotes(regua.vencidos)} vencidos`}
              </SinalSituacao>
              <Link to="/alertas?tipo=vencido" className="link-acao">
                Ver vencidos
              </Link>
            </div>
          )}

          <div>
            {/* Folha do mês: a linha dos dias da semana, a partir de hoje. Sempre o dia da semana: a
                coluna de hoje também tem as duas quartas seguintes; hoje é marcado pela placa preta */}
            <div aria-hidden className="hidden grid-cols-semana gap-x-esp-1 pb-esp-1 regua-estreita:grid">
              {regua.dias.slice(0, DIAS_DA_SEMANA).map((dia) => (
                <span key={dia.data} className="text-center text-fs-1 text-texto-suave">
                  {dia.semana}
                </span>
              ))}
            </div>
            {/* A grade é só visual: a lista oculta abaixo diz o mesmo ao leitor de tela, sem os dias vazios */}
            <ol
              aria-hidden
              className="grid grid-cols-regua gap-x-esp-1 border-t-tinta border-b border-b-borda regua-estreita:grid-cols-semana"
            >
              {regua.dias.map((dia, indice) => (
                <Dia key={dia.data} dia={dia} linhas={linhasDa(indice)} />
              ))}
            </ol>
            <ul className="visualmente-oculto">
              {comVencimento.map((dia) => (
                <li key={dia.data}>
                  {dia.hoje ? `Hoje, ${dia.descricao}` : dia.descricao}: {lotes(dia.lotes)}{' '}
                  {plural(dia.lotes, 'vence', 'vencem')}
                </li>
              ))}
            </ul>
          </div>

          {exemplo ? (
            <p className="text-fs-2 text-texto-suave">
              {/* A explicação do desenho é só para quem vê a grade; o leitor de tela já ouviu a lista */}
              <span aria-hidden>
                <span className="numeral inline-block rounded-p border-circulado border-texto px-esp-1 text-texto">
                  {exemplo.dia}
                </span>{' '}
                Dia circulado: vencem lotes nesse dia, e o número embaixo diz quantos.{' '}
              </span>
              {lotes(regua.lotesNaRegua)} em {formatarNumero(comVencimento.length)}{' '}
              {plural(comVencimento.length, 'dia', 'dias')}.
            </p>
          ) : (
            <p className="text-fs-2 text-texto-suave">Nenhum vencimento nos próximos {DIAS_DA_REGUA} dias.</p>
          )}

          {regua.depois > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-x-esp-4">
              <p className="text-fs-2 text-texto-suave">
                Mais {lotes(regua.depois)} {plural(regua.depois, 'vence', 'vencem')} depois de{' '}
                {diaEMes(regua.ultimoDia)}.
              </p>
              <Link to="/alertas?tipo=vencimento_proximo" className="link-acao">
                Ver a vencer
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
