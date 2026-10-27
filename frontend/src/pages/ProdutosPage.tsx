import { IconBox, IconPlus, IconSearch } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useRecurso } from '../api/useRecurso'
import { Aviso } from '../components/Aviso'
import { Botao, BotaoLink } from '../components/Botao'
import { Campo } from '../components/Campo'
import { Carregando, ErroEstado, Vazio } from '../components/Estados'
import { useMensagemDaNavegacao } from '../components/useMensagemDaNavegacao'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import type { Fornecedor } from '../types/fornecedor'
import type { Produto } from '../types/produto'
import { formatarNumero, plural } from '../utils/formato'
import { useAtraso } from '../utils/useAtraso'
import './ProdutosPage.css'

// Espera a pessoa parar de digitar antes de chamar a API
const ATRASO_BUSCA_MS = 300
const MAX_BUSCA = 120

// RN-23: produtos nunca são apagados, então não há ação de excluir
export function ProdutosPage() {
  useTituloDaPagina('Produtos')
  const [parametros, setParametros] = useSearchParams()
  const buscaNaUrl = parametros.get('busca') ?? ''
  const [busca, setBusca] = useState(buscaNaUrl)
  const termo = useAtraso(busca.trim(), ATRASO_BUSCA_MS)

  // A busca fica no endereço para sobreviver ao "voltar" do navegador
  useEffect(() => {
    if (termo !== buscaNaUrl) setParametros(termo ? { busca: termo } : {}, { replace: true })
  }, [termo, buscaNaUrl, setParametros])

  const caminho = termo ? `/products?busca=${encodeURIComponent(termo)}` : '/products'
  const { dados, erro, carregando, recarregar } = useRecurso<Produto[]>(caminho)
  const fornecedores = useRecurso<Fornecedor[]>('/suppliers')
  const mensagem = useMensagemDaNavegacao()

  const nomeDoFornecedor = useMemo(
    () => new Map((fornecedores.dados ?? []).map((f) => [f.id, f.nome])),
    [fornecedores.dados],
  )

  // Sem nenhum produto (e sem busca), a página vira só o convite para cadastrar
  const semProdutos = dados?.length === 0 && !termo && !busca.trim()
  const buscando = carregando && dados !== null

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Produtos</h1>
          <p className="pagina__apoio">Cadastro com código de barras, estoque mínimo e validade</p>
        </div>
        {/* Um único botão primário: sem produtos, ele fica no convite abaixo */}
        {dados && !semProdutos && (
          <div className="pagina__acoes">
            <BotaoLink to="/produtos/novo" variante="primaria" icone={IconPlus}>
              Cadastrar produto
            </BotaoLink>
          </div>
        )}
      </header>

      {mensagem && (
        <Aviso situacao="ok">
          <p>{mensagem}</p>
        </Aviso>
      )}

      {dados && !semProdutos && (
        <div className="produtos__busca" role="search">
          <Campo
            rotulo="Buscar por nome ou código de barras"
            type="search"
            name="busca"
            autoComplete="off"
            maxLength={MAX_BUSCA}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            acessorio={<IconSearch className="produtos__lupa" aria-hidden />}
          />
          <p className="produtos__contagem" role="status">
            {buscando
              ? 'Buscando…'
              : termo
                ? `${formatarNumero(dados.length)} ${plural(dados.length, 'produto encontrado', 'produtos encontrados')}`
                : `${formatarNumero(dados.length)} ${plural(dados.length, 'produto cadastrado', 'produtos cadastrados')}`}
          </p>
        </div>
      )}

      {!dados && carregando && <Carregando texto="Carregando produtos…" />}
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
            Cadastre os produtos para registrar entradas, acompanhar o saldo e receber alertas de validade.
          </Vazio>
        </div>
      )}

      {dados && !semProdutos && dados.length === 0 && !buscando && (
        <div className="painel">
          <Vazio
            icone={IconSearch}
            titulo="Nenhum produto encontrado"
            acao={<Botao onClick={() => setBusca('')}>Limpar busca</Botao>}
          >
            Nada com “{termo}” no nome ou no código de barras. Confira a digitação ou cadastre o produto.
          </Vazio>
        </div>
      )}

      {dados && dados.length > 0 && (
        <div className="painel">
          <table className="tabela produtos" aria-busy={buscando}>
            <caption className="visualmente-oculto">Produtos cadastrados</caption>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Código de barras</th>
                <th scope="col">Fornecedor</th>
                <th scope="col" className="tabela__numero">
                  Estoque mínimo
                </th>
              </tr>
            </thead>
            <tbody>
              {dados.map((p) => (
                <tr key={p.id}>
                  <td className="produtos__nome">
                    <Link to={`/produtos/${p.id}`} className="tabela__link">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="produtos__codigo numero">{p.codigo_barras}</td>
                  <td className="produtos__fornecedor">
                    {p.fornecedor_id === null ? (
                      <span className="tabela__vazio">Sem fornecedor</span>
                    ) : (
                      (nomeDoFornecedor.get(p.fornecedor_id) ?? <span className="tabela__vazio">Fornecedor {p.fornecedor_id}</span>)
                    )}
                  </td>
                  <td className="produtos__minimo tabela__numero numero">
                    <span className="produtos__rotulo-celular">Mínimo </span>
                    {formatarNumero(p.estoque_minimo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
