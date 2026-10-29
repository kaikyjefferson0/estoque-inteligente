import {
  IconAdjustmentsHorizontal,
  IconArrowsExchange,
  IconBox,
  IconPackageExport,
  IconPackageImport,
  IconRefresh,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useRecurso } from '../api/useRecurso'
import { Botao, BotaoLink } from '../components/Botao'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { Metadados, NomeEmLista } from '../components/Metadados'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import type { Dashboard, MovimentacaoRecente, TipoMovimentacao } from '../types/dashboard'
import type { Situacao } from '../types/situacao'
import { formatarComSinal, formatarData, formatarDataHora, formatarHora, formatarNumero, plural } from '../utils/formato'
import './DashboardPage.css'

interface Indicador {
  titulo: string
  valor: number
  // Situação quando o valor é maior que zero; com zero a etiqueta fica "ok"
  situacao: Exclude<Situacao, 'ok'>
  descricao: (valor: number) => string
}

function indicadores(d: Dashboard): Indicador[] {
  return [
    {
      titulo: 'Estoque baixo',
      valor: d.produtos_estoque_baixo,
      situacao: 'atencao',
      descricao: (n) => `${plural(n, 'produto', 'produtos')} no mínimo ou abaixo`,
    },
    {
      titulo: 'Sem estoque',
      valor: d.produtos_sem_estoque,
      situacao: 'critico',
      descricao: (n) => `${plural(n, 'produto', 'produtos')} com saldo zero`,
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
        {indicadores(dashboard).map(({ titulo, valor, situacao, descricao }) => {
          const atual: Situacao = valor > 0 ? situacao : 'ok'
          return (
            <li key={titulo} className={`situacao etiqueta etiqueta--${atual}`} data-ativo={valor > 0 || undefined}>
              <span className="situacao__titulo">{titulo}</span>
              <span className="situacao__valor numero">{formatarNumero(valor)}</span>
              <span className="situacao__descricao">{valor > 0 ? descricao(valor) : 'Nada pendente'}</span>
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
            <NomeEmLista nome={m.produto_nome} className="movimento__nome" />
            {/* Rótulo e valor em blocos próprios: um rótulo oculto na mesma linha gruda ao copiar */}
            <dl className="movimento__quantidade">
              <dt className="visualmente-oculto">Quantidade</dt>
              <dd className="numero">{formatarComSinal(quantidade)}</dd>
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
  const { dados, erro, carregando, atualizadoEm, recarregar } = useRecurso<Dashboard>('/dashboard')
  // Sem produtos, as faixas verdes dariam a falsa impressão de que está tudo em dia
  const semProdutos = dados?.total_produtos === 0

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Painel</h1>
          <p className="pagina__apoio">
            {atualizadoEm ? `Situação do estoque às ${formatarHora(atualizadoEm)}` : 'Situação do estoque agora'}
          </p>
        </div>
        <div className="pagina__acoes">
          {dados && (
            <Botao variante="fantasma" icone={IconRefresh} onClick={recarregar} carregando={carregando} textoCarregando="Atualizando…">
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

          <section className="painel" aria-labelledby="titulo-movimentos">
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
