import {
  IconAdjustmentsHorizontal,
  IconArrowsExchange,
  IconBox,
  IconPackageExport,
  IconPackageImport,
  IconRefresh,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useVencimentos } from '../alertas/useVencimentos'
import { useRecurso } from '../api/useRecurso'
import { Botao, BotaoLink } from '../components/Botao'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { FolhaDaData } from '../components/Folha'
import { Metadados, NomeEmLista } from '../components/Metadados'
import { ReguaVencimentos } from '../components/ReguaVencimentos'
import { SinalSituacao } from '../components/SinalSituacao'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import type { Dashboard, MovimentacaoRecente, TipoMovimentacao } from '../types/dashboard'
import type { Situacao } from '../types/situacao'
import {
  formatarComSinal,
  formatarData,
  formatarDataHora,
  formatarDiaDaSemana,
  formatarHora,
  formatarNumero,
  plural,
} from '../utils/formato'
import './DashboardPage.css'

interface Indicador {
  titulo: string
  valor: number
  // Situação quando o valor é maior que zero; com zero a etiqueta fica "ok"
  situacao: Exclude<Situacao, 'ok'>
  descricao: (valor: number) => string
  // Parte do grupo que tem situação própria (ex.: os sem estoque dentro do estoque baixo)
  parte?: { valor: number; situacao: Exclude<Situacao, 'ok'>; rotulo: string }
}

function indicadores(d: Dashboard): Indicador[] {
  return [
    {
      titulo: 'Estoque baixo',
      valor: d.produtos_estoque_baixo,
      situacao: 'atencao',
      descricao: (n) => `${plural(n, 'produto', 'produtos')} no mínimo ou abaixo`,
      // RN-13: saldo zero também é saldo no mínimo ou abaixo, então "Sem estoque" é parte deste grupo
      parte: { valor: d.produtos_sem_estoque, situacao: 'critico', rotulo: 'sem estoque' },
    },
    {
      titulo: 'A vencer',
      valor: d.lotes_a_vencer,
      situacao: 'atencao',
      descricao: (n) => `${plural(n, 'lote', 'lotes')} perto da validade`,
    },
    {
      titulo: 'Vencidos',
      valor: d.lotes_vencidos,
      situacao: 'critico',
      descricao: (n) => `${plural(n, 'lote', 'lotes')} com validade passada`,
    },
  ]
}

const TIPO: Record<TipoMovimentacao, { rotulo: string; icone: typeof IconPackageImport }> = {
  entrada: { rotulo: 'Entrada', icone: IconPackageImport },
  saida: { rotulo: 'Saída', icone: IconPackageExport },
  ajuste: { rotulo: 'Ajuste', icone: IconAdjustmentsHorizontal },
}

// Entrada soma, saída subtrai; o ajuste já vem com sinal da API
function quantidadeComSinal(m: MovimentacaoRecente): number {
  return m.tipo === 'saida' ? -m.quantidade : m.quantidade
}

function Situacoes({ dashboard }: { dashboard: Dashboard }) {
  return (
    <section aria-labelledby="titulo-situacao">
      <h2 id="titulo-situacao" className="visualmente-oculto">
        Situação do estoque
      </h2>
      <ul className="situacoes">
        {indicadores(dashboard).map(({ titulo, valor, situacao, descricao, parte }) => {
          const atual: Situacao = valor > 0 ? situacao : 'ok'
          return (
            <li key={titulo} className={`situacao etiqueta--${atual}`} data-ativo={valor > 0 || undefined}>
              <SinalSituacao situacao={atual} textoNaCor={false} className="situacao__titulo">
                {titulo}
              </SinalSituacao>
              <span className="situacao__valor numeral">{formatarNumero(valor)}</span>
              <span className="situacao__descricao">{valor > 0 ? descricao(valor) : 'Nada pendente'}</span>
              {parte && parte.valor > 0 && (
                <SinalSituacao situacao={parte.situacao} className="situacao__parte">
                  <span className="numero">{formatarNumero(parte.valor)}</span> {parte.rotulo}
                </SinalSituacao>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Movimentacoes({ itens }: { itens: MovimentacaoRecente[] }) {
  if (itens.length === 0) {
    return (
      <Vazio icone={IconArrowsExchange} titulo="Nenhuma movimentação ainda">
        As entradas, saídas e ajustes aparecem aqui. Use “Registrar entrada” para lançar o primeiro lote.
      </Vazio>
    )
  }
  return (
    <ul className="movimentos">
      {itens.map((m) => {
        const { rotulo, icone: Icone } = TIPO[m.tipo] ?? TIPO.ajuste
        const quantidade = quantidadeComSinal(m)
        return (
          <li key={m.id} className="movimento">
            <FolhaDaData iso={m.criado_em} className="movimento__folha" />
            <NomeEmLista nome={m.produto_nome} className="movimento__nome" />
            {/* Rótulo e valor em blocos próprios: um rótulo oculto na mesma linha gruda ao copiar */}
            <dl className="movimento__quantidade">
              <dt className="visualmente-oculto">Quantidade</dt>
              <dd className="numeral">{formatarComSinal(quantidade)}</dd>
            </dl>
            <Metadados
              className="movimento__metadados"
              itens={[
                {
                  rotulo: 'Tipo',
                  className: `movimento__tipo movimento__tipo--${m.tipo}`,
                  valor: (
                    <>
                      <Icone aria-hidden />
                      {rotulo}
                    </>
                  ),
                },
                {
                  rotulo: 'Lote',
                  rotuloVisivel: true,
                  valor: `${m.lote_id}, ${m.validade ? `validade ${formatarData(m.validade)}` : 'sem validade'}`,
                },
                { rotulo: 'Por', valor: <span title={m.usuario_nome}>{m.usuario_nome}</span> },
                { rotulo: 'Em', valor: <time dateTime={m.criado_em}>{formatarDataHora(m.criado_em)}</time> },
              ]}
            />
          </li>
        )
      })}
    </ul>
  )
}

export function DashboardPage() {
  useTituloDaPagina('Painel')
  const { dados, erro, carregando, atualizadoEm, recarregar: recarregarPainel } = useRecurso<Dashboard>('/dashboard')
  const vencimentos = useVencimentos()
  const { recarregar: recarregarVencimentos } = vencimentos
  // "Atualizar" e "Tentar de novo" refazem as duas leituras: a régua não fica mais velha que os números
  const recarregar = () => {
    recarregarPainel()
    recarregarVencimentos()
  }
  // Sem produtos, as faixas verdes dariam a falsa impressão de que está tudo em dia
  const semProdutos = dados?.total_produtos === 0

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Painel</h1>
          <p className="pagina__apoio">
            {/* O dia não depende da API: aparece já no carregando e no erro; a hora, só com a resposta */}
            {atualizadoEm
              ? `${formatarDiaDaSemana(atualizadoEm)} · situação às ${formatarHora(atualizadoEm)}`
              : `${formatarDiaDaSemana(new Date())} · situação do estoque`}
          </p>
        </div>
        <div className="pagina__acoes">
          {dados && (
            <Botao variante="fantasma" icone={IconRefresh} onClick={recarregar} carregando={carregando || vencimentos.carregando} textoCarregando="Atualizando…">
              Atualizar
            </Botao>
          )}
          {/* Um único botão primário: sem produtos, ele fica no convite abaixo */}
          {!semProdutos && (
            <BotaoLink to="/entrada" variante="primaria" icone={IconPackageImport}>
              Registrar entrada
            </BotaoLink>
          )}
        </div>
      </header>

      {!dados && carregando && <Carregando texto="Carregando a situação do estoque…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados && semProdutos && (
        <div className="painel">
          <Vazio
            icone={IconBox}
            titulo="Cadastre seu primeiro produto"
            acao={
              <BotaoLink to="/produtos" variante="primaria">
                Cadastrar produto
              </BotaoLink>
            }
          >
            Com os produtos cadastrados, o painel mostra o estoque baixo, os lotes a vencer e as últimas movimentações.
          </Vazio>
        </div>
      )}

      {dados && !semProdutos && (
        <>
          <Situacoes dashboard={dados} />

          <div className="totais">
            <dl className="totais__lista">
              <div className="totais__item">
                <dt>Produtos cadastrados</dt>
                <dd className="numero">{formatarNumero(dados.total_produtos)}</dd>
              </div>
              <div className="totais__item">
                <dt>Alertas ativos</dt>
                <dd className="numero">{formatarNumero(dados.alertas_ativos)}</dd>
              </div>
            </dl>
            {dados.alertas_ativos > 0 && (
              <Link to="/alertas" className="link-acao">
                Ver alertas
              </Link>
            )}
          </div>

          <ReguaVencimentos vencimentos={vencimentos} />

          <section className="painel painel--dados" aria-labelledby="titulo-movimentos">
            <div className="painel__cabecalho">
              <h2 id="titulo-movimentos">Últimas movimentações</h2>
              <Link to="/estoque">Ver estoque</Link>
            </div>
            <Movimentacoes itens={dados.ultimas_movimentacoes} />
          </section>
        </>
      )}
    </div>
  )
}
