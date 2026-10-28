import {
  IconAdjustmentsHorizontal,
  IconArrowsExchange,
  IconBox,
  IconPackageExport,
  IconPackageImport,
  IconPencil,
} from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { montarCaminho } from '../api/caminho'
import { useRecurso } from '../api/useRecurso'
import { useAuth } from '../auth/useAuth'
import { Aviso } from '../components/Aviso'
import { BotaoLink } from '../components/Botao'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { Paginacao } from '../components/Paginacao'
import { useMensagemDaNavegacao } from '../components/useMensagemDaNavegacao'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import type { TipoMovimentacao } from '../types/dashboard'
import type { Movimentacao } from '../types/estoque'
import type { Pagina } from '../types/pagina'
import type { Produto, SaldoProduto } from '../types/produto'
import { formatarComSinal, formatarDataHora, formatarNumero, hojeIso, plural } from '../utils/formato'
import { descreverLote, situacaoDoLote } from '../utils/situacao'
import './ProdutoDetalhePage.css'

function Ficha({ produto }: { produto: Produto }) {
  const fornecedor = produto.fornecedor_nome ?? 'Sem fornecedor'

  const dias = produto.dias_alerta_validade ?? 0
  return (
    <section className="painel" aria-labelledby="titulo-cadastro">
      <div className="painel__cabecalho">
        <h2 id="titulo-cadastro">Cadastro</h2>
      </div>
      <dl className="ficha">
        <div className="ficha__item">
          <dt>Código de barras</dt>
          <dd className="numero">{produto.codigo_barras}</dd>
        </div>
        <div className="ficha__item">
          <dt>Fornecedor</dt>
          <dd className={produto.fornecedor_nome === null ? 'ficha__vazio' : 'texto-inteiro'}>{fornecedor}</dd>
        </div>
        <div className="ficha__item">
          <dt>Estoque mínimo</dt>
          <dd className="numero">{formatarNumero(produto.estoque_minimo)}</dd>
        </div>
        <div className="ficha__item">
          <dt>Validade</dt>
          <dd>
            {produto.controla_validade
              ? `Controla validade; alerta ${formatarNumero(dias)} ${plural(dias, 'dia', 'dias')} antes de vencer`
              : 'Não controla validade'}
          </dd>
        </div>
        <div className="ficha__item">
          <dt>Cadastrado em</dt>
          <dd className="numero">{formatarDataHora(produto.criado_em)}</dd>
        </div>
      </dl>
    </section>
  )
}

function Estoque({ produto }: { produto: Produto }) {
  const { usuario } = useAuth()
  const { dados, erro, carregando, recarregar } = useRecurso<SaldoProduto>(`/products/${produto.id}/stock`)
  const hoje = hojeIso()
  const vencidos = dados ? dados.saldo_fisico - dados.saldo_disponivel : 0

  return (
    <section className="painel detalhe__lotes" aria-labelledby="titulo-lotes">
      <div className="painel__cabecalho">
        <h2 id="titulo-lotes">Estoque e lotes</h2>
        {/* RN-02: só o admin ajusta; o backend confere de novo */}
        {usuario?.perfil === 'admin' && dados && dados.lotes.length > 0 && (
          <Link to={`/ajustes?produto=${produto.id}`}>Ajustar lote</Link>
        )}
      </div>
      {!dados && carregando && <Carregando texto="Carregando os lotes…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}
      {dados && (
        <>
          <div className="saldos">
            <dl className="saldos__lista">
              <div className="saldos__item">
                <dt>Disponível</dt>
                <dd className="numero">{formatarNumero(dados.saldo_disponivel)}</dd>
              </div>
              <div className="saldos__item saldos__item--fisico">
                <dt>Físico</dt>
                <dd className="numero">{formatarNumero(dados.saldo_fisico)}</dd>
              </div>
            </dl>
            {/* Com saldo zero não há o que explicar */}
            {dados.saldo_fisico > 0 && (
              <p className={vencidos > 0 ? 'saldos__nota saldos__nota--vencidos' : 'saldos__nota'}>
                {vencidos > 0
                  ? `${formatarNumero(vencidos)} em lotes vencidos: contam no físico, mas não saem até serem ajustados.`
                  : 'Nenhuma unidade vencida: todo o saldo pode sair.'}
              </p>
            )}
          </div>
          {dados.lotes.length === 0 ? (
            <Vazio
              icone={IconBox}
              titulo="Nenhum lote com saldo"
              acao={
                <BotaoLink to="/entrada" icone={IconPackageImport}>
                  Registrar entrada
                </BotaoLink>
              }
            >
              Os lotes aparecem aqui, na ordem de saída, depois da primeira entrada.
            </Vazio>
          ) : (
            // RN-10: ordem FEFO, como vem da API (sem validade por último)
            <ol className="lotes" aria-label="Lotes na ordem de saída">
              {dados.lotes.map((lote) => {
                const situacao = situacaoDoLote(lote, hoje)
                return (
                  <li
                    key={lote.id}
                    className={`lote etiqueta etiqueta--${situacao.etiqueta}`}
                    data-problema={situacao.etiqueta !== 'ok' || undefined}
                  >
                    <span className="lote__validade numero">{descreverLote(lote.validade)}</span>
                    <span className="lote__situacao">{situacao.rotulo}</span>
                    <span className="lote__quantidade numero">{formatarNumero(lote.quantidade)}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </>
      )}
    </section>
  )
}

const TIPO: Record<TipoMovimentacao, { rotulo: string; icone: typeof IconPackageImport }> = {
  entrada: { rotulo: 'Entrada', icone: IconPackageImport },
  saida: { rotulo: 'Saída', icone: IconPackageExport },
  ajuste: { rotulo: 'Ajuste', icone: IconAdjustmentsHorizontal },
}

const POR_PAGINA = 20

function Historico({ produtoId }: { produtoId: number }) {
  const [deslocamento, setDeslocamento] = useState(0)
  const recurso = useRecurso<Pagina<Movimentacao>>(
    montarCaminho(`/products/${produtoId}/movements`, { limite: POR_PAGINA, deslocamento: deslocamento || null }),
  )
  const { erro, carregando, recarregar } = recurso
  const dados = recurso.dados?.itens ?? null
  const total = recurso.dados?.total ?? 0

  return (
    <section className="painel" aria-labelledby="titulo-historico">
      <div className="painel__cabecalho">
        <h2 id="titulo-historico">Histórico</h2>
        {total > 0 && (
          <span className="historico__total">
            {formatarNumero(total)} {plural(total, 'movimentação', 'movimentações')}
          </span>
        )}
      </div>
      {!dados && carregando && <Carregando texto="Carregando o histórico…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}
      {dados && total === 0 && (
        <Vazio icone={IconArrowsExchange} titulo="Nenhuma movimentação ainda">
          As entradas, saídas e ajustes deste produto ficam registrados aqui.
        </Vazio>
      )}
      {dados && total > 0 && (
        // RN-12: histórico só para leitura, sem editar nem apagar
        <>
          <ul className="historico" aria-busy={carregando}>
            {dados.map((m) => {
              const { rotulo, icone: Icone } = TIPO[m.tipo] ?? TIPO.ajuste
              // Entrada soma, saída subtrai; o ajuste já vem com sinal
              const quantidade = m.tipo === 'saida' ? -m.quantidade : m.quantidade
              return (
                <li key={m.id} className="historico__item">
                  <time dateTime={m.criado_em} className="historico__data numero">
                    {formatarDataHora(m.criado_em)}
                  </time>
                  <span className="historico__tipo">
                    <Icone aria-hidden />
                    {rotulo}
                  </span>
                  <span className="historico__lote">{descreverLote(m.validade)}</span>
                  <span className="historico__quantidade numero">
                    <span className="visualmente-oculto">Quantidade </span>
                    {formatarComSinal(quantidade)}
                  </span>
                  <span className="historico__usuario">{m.usuario_nome}</span>
                  {/* RN-34: no ajuste, o saldo do lote antes e depois e o motivo */}
                  {m.tipo === 'ajuste' && (
                    <span className="historico__ajuste">
                      {m.saldo_anterior !== null && m.saldo_novo !== null && (
                        <span>
                          Saldo do lote:{' '}
                          <span className="numero">
                            {formatarNumero(m.saldo_anterior)} <span aria-hidden>→</span>
                            <span className="visualmente-oculto"> para </span> {formatarNumero(m.saldo_novo)}
                          </span>
                        </span>
                      )}
                      {m.motivo && <span>Motivo: {m.motivo}</span>}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="historico__paginacao">
            <Paginacao
              total={total}
              limite={POR_PAGINA}
              deslocamento={deslocamento}
              aoMudar={setDeslocamento}
              nomeDaLista="movimentações"
            />
          </div>
        </>
      )}
    </section>
  )
}

export function ProdutoDetalhePage() {
  const { id } = useParams()
  const { dados, erro, statusErro, carregando, recarregar } = useRecurso<Produto>(`/products/${id}`)
  useTituloDaPagina(dados?.nome ?? 'Produto')
  const mensagem = useMensagemDaNavegacao()

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <Link to="/produtos" className="link-acao">
            Produtos
          </Link>
          <h1 className="detalhe__titulo">{dados?.nome ?? 'Produto'}</h1>
        </div>
        {dados && (
          <div className="pagina__acoes">
            <BotaoLink to={`/produtos/${dados.id}/editar`} variante="primaria" icone={IconPencil}>
              Editar
            </BotaoLink>
          </div>
        )}
      </header>

      {mensagem && (
        <Aviso situacao="ok">
          <p>{mensagem}</p>
        </Aviso>
      )}

      {!dados && carregando && <Carregando texto="Carregando produto…" />}
      {erro && statusErro === 404 && (
        <div className="painel">
          <Vazio icone={IconBox} titulo="Produto não encontrado" acao={<BotaoLink to="/produtos">Ver produtos</BotaoLink>}>
            Confira o endereço ou procure o produto na lista.
          </Vazio>
        </div>
      )}
      {erro && statusErro !== 404 && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados && (
        <>
          <Ficha produto={dados} />

          <Estoque produto={dados} />
          <Historico produtoId={dados.id} />
        </>
      )}
    </div>
  )
}
