import { IconBox, IconCircleCheck, IconPackageImport, IconRefresh, IconSearch } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useRecurso } from '../api/useRecurso'
import { Botao, BotaoLink } from '../components/Botao'
import { Campo } from '../components/Campo'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import type { ItemEstoque, SituacaoEstoque } from '../types/estoque'
import { formatarHora, formatarNumero, plural } from '../utils/formato'
import { SITUACAO_DO_ESTOQUE } from '../utils/situacao'
import './EstoquePage.css'

type Filtro = 'todos' | Exclude<SituacaoEstoque, 'ok'>

const FILTROS: { valor: Filtro; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'baixo', rotulo: 'Estoque baixo' },
  { valor: 'sem_estoque', rotulo: 'Sem estoque' },
]

const VAZIO_DO_FILTRO: Record<Exclude<Filtro, 'todos'>, { titulo: string; texto: string }> = {
  baixo: { titulo: 'Nenhum produto com estoque baixo', texto: 'Todos os produtos estão acima do estoque mínimo.' },
  sem_estoque: { titulo: 'Nenhum produto sem estoque', texto: 'Todos os produtos têm saldo disponível para saída.' },
}

const MAX_BUSCA = 120

function lerFiltro(valor: string | null): Filtro {
  return valor === 'baixo' || valor === 'sem_estoque' ? valor : 'todos'
}

function Linha({ item }: { item: ItemEstoque }) {
  const { etiqueta, rotulo } = SITUACAO_DO_ESTOQUE[item.situacao]
  // Diferença entre físico e disponível = lotes vencidos, que não saem (RN-36)
  const vencidos = item.saldo_fisico - item.saldo_disponivel
  return (
    <tr className={`estoque__linha etiqueta etiqueta--${etiqueta}`} data-problema={item.situacao !== 'ok' || undefined}>
      <td className="estoque__produto">
        {/* Código como segunda linha do link: o alvo cresce com o nome, sem sobrepor */}
        <Link to={`/produtos/${item.produto_id}`} className="estoque__link">
          <span className="estoque__nome">{item.nome}</span>
          <span className="estoque__codigo numero">{item.codigo_barras}</span>
        </Link>
      </td>
      <td className="estoque__saldo tabela__numero">
        <span className="estoque__disponivel numero">
          <span className="estoque__rotulo-celular">Disponível </span>
          {formatarNumero(item.saldo_disponivel)}
        </span>
        {vencidos > 0 && (
          <span className="estoque__fisico numero">
            Físico {formatarNumero(item.saldo_fisico)}
          </span>
        )}
      </td>
      <td className="estoque__minimo tabela__numero numero">
        <span className="estoque__rotulo-celular">Mínimo </span>
        {formatarNumero(item.estoque_minimo)}
      </td>
      <td className="estoque__situacao">
        <span className="visualmente-oculto">Situação: </span>
        {rotulo}
      </td>
    </tr>
  )
}

// RN-46: admin e operador veem a lista de estoque
export function EstoquePage() {
  useTituloDaPagina('Estoque')
  const [parametros, setParametros] = useSearchParams()
  // Estado local responde na hora; o endereço só espelha (a navegação do router é uma transição)
  const [filtro, setFiltro] = useState(() => lerFiltro(parametros.get('situacao')))
  const [busca, setBusca] = useState(() => parametros.get('busca') ?? '')

  const caminho = filtro === 'todos' ? '/stock' : `/stock?situacao=${filtro}`
  const { dados, erro, carregando, atualizadoEm, recarregar } = useRecurso<ItemEstoque[]>(caminho)

  // Filtro e busca ficam no endereço para sobreviver ao "voltar" do navegador
  function mudar(chave: 'situacao' | 'busca', valor: string) {
    if (chave === 'situacao') setFiltro(lerFiltro(valor))
    else setBusca(valor)
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais)
        if (valor && valor !== 'todos') novos.set(chave, valor)
        else novos.delete(chave)
        return novos
      },
      { replace: true },
    )
  }

  // A lista inteira já vem da API; a busca filtra na tela, sem nova chamada
  const termo = busca.trim().toLowerCase()
  const itens = useMemo(
    () => (dados ?? []).filter((i) => !termo || i.nome.toLowerCase().includes(termo) || i.codigo_barras.includes(termo)),
    [dados, termo],
  )

  const semProdutos = dados?.length === 0 && filtro === 'todos'
  const trocando = carregando && dados !== null

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Estoque</h1>
          <p className="pagina__apoio">
            {atualizadoEm ? `Saldos às ${formatarHora(atualizadoEm)}` : 'Saldo disponível e situação de cada produto'}
          </p>
        </div>
        <div className="pagina__acoes">
          {dados && (
            <Botao variante="fantasma" icone={IconRefresh} onClick={recarregar} carregando={carregando} textoCarregando="Atualizando…">
              Atualizar
            </Botao>
          )}
          {!semProdutos && (
            <BotaoLink to="/entrada" variante="primaria" icone={IconPackageImport}>
              Registrar entrada
            </BotaoLink>
          )}
        </div>
      </header>

      {!semProdutos && (dados || filtro !== 'todos') && (
        <div className="estoque__filtros">
          <fieldset className="segmentos">
            <legend className="visualmente-oculto">Mostrar</legend>
            {FILTROS.map((f) => (
              <label key={f.valor} className="segmentos__opcao">
                <input
                  type="radio"
                  name="situacao"
                  value={f.valor}
                  checked={filtro === f.valor}
                  onChange={() => mudar('situacao', f.valor)}
                />
                <span>{f.rotulo}</span>
              </label>
            ))}
          </fieldset>
          <div className="estoque__busca" role="search">
            <Campo
              rotulo="Buscar por nome ou código de barras"
              type="search"
              name="busca"
              autoComplete="off"
              maxLength={MAX_BUSCA}
              value={busca}
              onChange={(e) => mudar('busca', e.target.value)}
              acessorio={<IconSearch className="estoque__lupa" aria-hidden />}
            />
          </div>
          {dados && (
            <p className="estoque__contagem" role="status">
              {trocando ? 'Carregando…' : `${formatarNumero(itens.length)} ${plural(itens.length, 'produto', 'produtos')}`}
            </p>
          )}
        </div>
      )}

      {!dados && carregando && <Carregando texto="Carregando o estoque…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}

      {dados && semProdutos && (
        <div className="painel">
          <Vazio
            icone={IconBox}
            titulo="Nenhum produto cadastrado"
            acao={
              <BotaoLink to="/produtos/novo" variante="primaria">
                Cadastrar produto
              </BotaoLink>
            }
          >
            Cadastre os produtos e registre as entradas para acompanhar o saldo aqui.
          </Vazio>
        </div>
      )}

      {dados && !semProdutos && !trocando && dados.length === 0 && filtro !== 'todos' && (
        <div className="painel">
          <Vazio
            icone={IconCircleCheck}
            titulo={VAZIO_DO_FILTRO[filtro].titulo}
            acao={<Botao onClick={() => mudar('situacao', 'todos')}>Ver todos os produtos</Botao>}
          >
            {VAZIO_DO_FILTRO[filtro].texto}
          </Vazio>
        </div>
      )}

      {dados && dados.length > 0 && itens.length === 0 && (
        <div className="painel">
          <Vazio icone={IconSearch} titulo="Nenhum produto encontrado" acao={<Botao onClick={() => mudar('busca', '')}>Limpar busca</Botao>}>
            Nada com “{busca.trim()}” no nome ou no código de barras. Confira a digitação.
          </Vazio>
        </div>
      )}

      {itens.length > 0 && (
        <div className="estoque__painel">
          <table className="tabela estoque" aria-busy={trocando}>
            <caption className="visualmente-oculto">Saldo e situação dos produtos</caption>
            <thead>
              <tr>
                <th scope="col">Produto</th>
                <th scope="col" className="tabela__numero estoque__coluna-numero">
                  Disponível
                </th>
                <th scope="col" className="tabela__numero estoque__coluna-numero">
                  Mínimo
                </th>
                <th scope="col" className="estoque__coluna-situacao">
                  Situação
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <Linha key={item.produto_id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
