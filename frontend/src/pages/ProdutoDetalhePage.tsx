import { IconBox, IconPencil } from '@tabler/icons-react'
import { Link, useParams } from 'react-router-dom'
import { useRecurso } from '../api/useRecurso'
import { Aviso } from '../components/Aviso'
import { BotaoLink } from '../components/Botao'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { useMensagemDaNavegacao } from '../components/useMensagemDaNavegacao'
import type { Fornecedor } from '../types/fornecedor'
import type { Produto } from '../types/produto'
import { formatarDataHora, formatarNumero, plural } from '../utils/formato'
import './ProdutoDetalhePage.css'

function Ficha({ produto }: { produto: Produto }) {
  const fornecedores = useRecurso<Fornecedor[]>('/suppliers')
  let fornecedor: string
  if (produto.fornecedor_id === null) fornecedor = 'Sem fornecedor'
  else
    fornecedor =
      fornecedores.dados?.find((f) => f.id === produto.fornecedor_id)?.nome ??
      (fornecedores.carregando ? 'Carregando…' : `Fornecedor ${produto.fornecedor_id}`)

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
          <dd className={produto.fornecedor_id === null ? 'ficha__vazio' : undefined}>{fornecedor}</dd>
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

export function ProdutoDetalhePage() {
  const { id } = useParams()
  const { dados, erro, statusErro, carregando, recarregar } = useRecurso<Produto>(`/products/${id}`)
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

          {/* Parte C: lotes com saldo e histórico de movimentações */}
          <section className="painel" aria-labelledby="titulo-lotes">
            <div className="painel__cabecalho">
              <h2 id="titulo-lotes">Lotes</h2>
            </div>
            <p className="detalhe__reservado">Os lotes deste produto, com validade e saldo, vão aparecer aqui.</p>
          </section>
          <section className="painel" aria-labelledby="titulo-historico">
            <div className="painel__cabecalho">
              <h2 id="titulo-historico">Histórico</h2>
            </div>
            <p className="detalhe__reservado">As entradas, saídas e ajustes deste produto vão aparecer aqui.</p>
          </section>
        </>
      )}
    </div>
  )
}
