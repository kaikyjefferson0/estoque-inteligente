import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiError, api, mensagemDeErro } from '../api/client'
import { useRecurso } from '../api/useRecurso'
import { AnuncioDeErros } from '../components/AnuncioDeErros'
import { Aviso } from '../components/Aviso'
import { Botao, BotaoLink } from '../components/Botao'
import { CaixaDeMarcar } from '../components/CaixaDeMarcar'
import { Campo } from '../components/Campo'
import { CampoSelecao } from '../components/CampoSelecao'
import { Carregando, ErroEstado } from '../components/Estados'
import { useErrosDoFormulario, type ErrosDeCampo } from '../components/useErrosDoFormulario'
import type { Fornecedor } from '../types/fornecedor'
import type { Produto, SaldoProduto } from '../types/produto'

// Ordem dos campos na tela: o foco vai para o primeiro inválido
const CAMPOS = [
  'nome',
  'codigo_barras',
  'estoque_minimo',
  'fornecedor_id',
  'controla_validade',
  'dias_alerta_validade',
] as const
type CampoProduto = (typeof CAMPOS)[number]

const MAX_NOME = 120
const MAX_CODIGO = 50
const MAX_INTEIRO = 2_147_483_647 // limite da coluna INTEGER do banco
const INTEIRO = /^\d+$/

interface Valores {
  nome: string
  codigoBarras: string
  estoqueMinimo: string
  fornecedorId: string
  controlaValidade: boolean
  diasAlerta: string
}

function validar(v: Valores): ErrosDeCampo<CampoProduto> {
  const erros: ErrosDeCampo<CampoProduto> = {}
  if (!v.nome.trim()) erros.nome = 'Informe o nome do produto.'
  else if (v.nome.trim().length > MAX_NOME) erros.nome = `Use até ${MAX_NOME} caracteres no nome.`

  if (!v.codigoBarras.trim()) erros.codigo_barras = 'Informe o código de barras.'
  else if (v.codigoBarras.trim().length > MAX_CODIGO) erros.codigo_barras = `Use até ${MAX_CODIGO} caracteres no código.`

  const minimo = v.estoqueMinimo.trim()
  if (!minimo) erros.estoque_minimo = 'Informe o estoque mínimo. Use 0 se não quiser alerta de estoque baixo.'
  else if (!INTEIRO.test(minimo)) erros.estoque_minimo = 'Use um número inteiro, 0 ou maior.'
  else if (Number(minimo) > MAX_INTEIRO) erros.estoque_minimo = 'Use um número menor.'

  // RN-26: com controle de validade, os dias de alerta são obrigatórios e maiores que zero
  if (v.controlaValidade) {
    const dias = v.diasAlerta.trim()
    if (!dias) erros.dias_alerta_validade = 'Informe com quantos dias de antecedência avisar.'
    else if (!INTEIRO.test(dias) || Number(dias) === 0)
      erros.dias_alerta_validade = 'Use um número inteiro de dias, maior que zero.'
    else if (Number(dias) > MAX_INTEIRO) erros.dias_alerta_validade = 'Use um número menor.'
  }
  return erros
}

function paraApi(v: Valores) {
  return {
    nome: v.nome.trim(),
    codigo_barras: v.codigoBarras.trim(),
    estoque_minimo: Number(v.estoqueMinimo.trim()),
    controla_validade: v.controlaValidade,
    // RN-26: sem controle de validade, os dias ficam vazios
    dias_alerta_validade: v.controlaValidade ? Number(v.diasAlerta.trim()) : null,
    fornecedor_id: v.fornecedorId ? Number(v.fornecedorId) : null,
  }
}

function valoresIniciais(p?: Produto): Valores {
  return {
    nome: p?.nome ?? '',
    codigoBarras: p?.codigo_barras ?? '',
    estoqueMinimo: p ? String(p.estoque_minimo) : '',
    fornecedorId: p?.fornecedor_id ? String(p.fornecedor_id) : '',
    controlaValidade: p?.controla_validade ?? false,
    diasAlerta: p?.dias_alerta_validade ? String(p.dias_alerta_validade) : '',
  }
}

// RN-30: se o produto já tem lote, "controla validade" não muda
type Lotes = 'verificando' | 'tem' | 'nao-tem' | 'desconhecido'

function SelecaoDeFornecedor({
  valor,
  erro,
  aoMudar,
}: {
  valor: string
  erro?: string
  aoMudar: (valor: string) => void
}) {
  const { dados, erro: erroLista, carregando, recarregar } = useRecurso<Fornecedor[]>('/suppliers')

  let dica
  if (!dados && carregando) dica = 'Carregando fornecedores…'
  else if (erroLista)
    dica = (
      <>
        Não foi possível carregar os fornecedores.{' '}
        <button type="button" className="link-botao" onClick={recarregar}>
          Tentar de novo
        </button>
      </>
    )
  else if (dados?.length === 0)
    dica = (
      <>
        Nenhum fornecedor cadastrado. <Link to="/fornecedores/novo">Cadastrar fornecedor</Link>
      </>
    )

  return (
    <CampoSelecao
      rotulo="Fornecedor (opcional)"
      name="fornecedor_id"
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      disabled={!dados}
      erro={erro}
      dica={dica}
    >
      <option value="">Sem fornecedor</option>
      {dados?.map((f) => (
        <option key={f.id} value={f.id}>
          {f.nome}
        </option>
      ))}
      {/* Mantém a opção salva visível enquanto a lista não chega */}
      {!dados && valor && <option value={valor}>Fornecedor atual</option>}
    </CampoSelecao>
  )
}

function FormularioProduto({
  inicial,
  lotes = 'nao-tem',
  codigoInicial,
}: {
  inicial?: Produto
  lotes?: Lotes
  // Código lido na Entrada que não existia: já vem preenchido
  codigoInicial?: string
}) {
  const navigate = useNavigate()
  const [valores, setValores] = useState(() => {
    const iniciais = valoresIniciais(inicial)
    return codigoInicial ? { ...iniciais, codigoBarras: codigoInicial } : iniciais
  })
  const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  // A API pode recusar mesmo quando a consulta de lotes não mostrou nenhum (ex.: lotes zerados)
  const [bloqueadoPelaApi, setBloqueadoPelaApi] = useState(false)
  const validadeBloqueada = lotes === 'tem' || bloqueadoPelaApi

  function alterar<K extends keyof Valores>(chave: K, valor: Valores[K], campo: CampoProduto) {
    setValores((atuais) => ({ ...atuais, [chave]: valor }))
    limpar(campo)
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = evento.currentTarget
    setErroGeral(null)
    if (!mostrar(form, validar(valores))) return

    const dados = paraApi(valores)
    // Na edição, envia só o que mudou
    const corpo = inicial
      ? Object.fromEntries(Object.entries(dados).filter(([campo, valor]) => inicial[campo as keyof Produto] !== valor))
      : dados

    setEnviando(true)
    try {
      const salvo = inicial
        ? await api<Produto>(`/products/${inicial.id}`, { method: 'PATCH', body: corpo })
        : await api<Produto>('/products', { body: corpo })
      navigate(`/produtos/${salvo.id}`, { state: { mensagem: inicial ? 'Alterações salvas' : 'Produto cadastrado' } })
    } catch (erro) {
      setEnviando(false)
      if (erro instanceof ApiError && erro.status === 409 && /código de barras/i.test(erro.message)) {
        // RN-04: código de barras repetido aparece no próprio campo
        mostrar(form, { codigo_barras: 'Este código de barras já está cadastrado em outro produto. Confira o número.' })
      } else if (erro instanceof ApiError && erro.status === 409 && inicial && 'controla_validade' in corpo) {
        // RN-30: volta a opção ao valor salvo e bloqueia
        setBloqueadoPelaApi(true)
        setValores((atuais) => ({
          ...atuais,
          controlaValidade: inicial.controla_validade,
          diasAlerta: inicial.dias_alerta_validade ? String(inicial.dias_alerta_validade) : '',
        }))
        setErroGeral('Este produto já tem lotes, então “Controla validade” voltou ao valor salvo. Revise e salve de novo.')
      } else if (erro instanceof ApiError && Object.keys(erro.campos).length > 0) {
        mostrar(form, erro.campos)
        setErroGeral(erro.message)
      } else {
        setErroGeral(mensagemDeErro(erro))
      }
    }
  }

  let dicaValidade: string | undefined
  if (validadeBloqueada)
    dicaValidade = 'Não dá para mudar: o produto já tem lotes registrados, e o histórico deles depende desta opção.'
  else if (lotes === 'verificando') dicaValidade = 'Verificando se o produto já tem lotes…'
  else dicaValidade = 'Marque para registrar a validade em cada entrada e receber alertas de vencimento.'

  return (
    <form className="painel formulario" onSubmit={aoEnviar} noValidate>
      <AnuncioDeErros mensagem={anuncio} />
      {erroGeral && (
        <Aviso situacao="critico">
          <p>{erroGeral}</p>
        </Aviso>
      )}
      <Campo
        rotulo="Nome"
        name="nome"
        autoComplete="off"
        autoFocus={!inicial}
        maxLength={MAX_NOME}
        value={valores.nome}
        onChange={(e) => alterar('nome', e.target.value, 'nome')}
        erro={erros.nome}
      />
      <Campo
        rotulo="Código de barras"
        name="codigo_barras"
        autoComplete="off"
        inputMode="numeric"
        className="numero"
        maxLength={MAX_CODIGO}
        value={valores.codigoBarras}
        onChange={(e) => alterar('codigoBarras', e.target.value, 'codigo_barras')}
        erro={erros.codigo_barras}
      />
      <Campo
        rotulo="Estoque mínimo"
        name="estoque_minimo"
        inputMode="numeric"
        autoComplete="off"
        className="numero"
        dica="Com o saldo igual ou abaixo deste número, o produto entra em estoque baixo."
        value={valores.estoqueMinimo}
        onChange={(e) => alterar('estoqueMinimo', e.target.value, 'estoque_minimo')}
        erro={erros.estoque_minimo}
      />
      <SelecaoDeFornecedor
        valor={valores.fornecedorId}
        erro={erros.fornecedor_id}
        aoMudar={(valor) => alterar('fornecedorId', valor, 'fornecedor_id')}
      />

      <div className="formulario__grupo">
        <CaixaDeMarcar
          rotulo="Controla validade"
          name="controla_validade"
          checked={valores.controlaValidade}
          disabled={validadeBloqueada || lotes === 'verificando'}
          dica={dicaValidade}
          erro={erros.controla_validade}
          onChange={(e) => {
            const marcado = e.target.checked
            // RN-26: ao desmarcar, os dias de alerta são limpos
            setValores((atuais) => ({ ...atuais, controlaValidade: marcado, diasAlerta: marcado ? atuais.diasAlerta : '' }))
            limpar('controla_validade')
            limpar('dias_alerta_validade')
          }}
        />
        {valores.controlaValidade && (
          <Campo
            rotulo="Dias de alerta"
            name="dias_alerta_validade"
            inputMode="numeric"
            autoComplete="off"
            className="numero"
            dica="Quantos dias antes de vencer o lote entra em alerta."
            value={valores.diasAlerta}
            onChange={(e) => alterar('diasAlerta', e.target.value, 'dias_alerta_validade')}
            erro={erros.dias_alerta_validade}
          />
        )}
      </div>

      <div className="formulario__acoes">
        <Botao type="submit" variante="primaria" carregando={enviando} textoCarregando={inicial ? 'Salvando…' : 'Cadastrando…'}>
          {inicial ? 'Salvar alterações' : 'Cadastrar produto'}
        </Botao>
        <BotaoLink to={inicial ? `/produtos/${inicial.id}` : '/produtos'} variante="fantasma">
          Cancelar
        </BotaoLink>
      </div>
    </form>
  )
}

export function ProdutoNovoPage() {
  const [parametros] = useSearchParams()
  const codigo = (parametros.get('codigo') ?? '').trim().slice(0, MAX_CODIGO)
  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Cadastrar produto</h1>
          <p className="pagina__apoio">O código de barras não pode se repetir entre produtos.</p>
        </div>
      </header>
      <FormularioProduto codigoInicial={codigo || undefined} />
    </div>
  )
}

export function ProdutoEditarPage() {
  const { id } = useParams()
  const produto = useRecurso<Produto>(`/products/${id}`)
  const saldo = useRecurso<SaldoProduto>(`/products/${id}/stock`)

  let lotes: Lotes = 'verificando'
  if (saldo.dados) lotes = saldo.dados.lotes.length > 0 ? 'tem' : 'nao-tem'
  // Sem a consulta, a API ainda protege a regra (409) e o formulário mostra o motivo
  else if (saldo.erro) lotes = 'desconhecido'

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Editar produto</h1>
          {produto.dados && <p className="pagina__apoio">{produto.dados.nome}</p>}
        </div>
      </header>
      {!produto.dados && produto.carregando && <Carregando texto="Carregando produto…" />}
      {produto.erro && <ErroEstado mensagem={produto.erro} aoTentarDeNovo={produto.recarregar} />}
      {produto.dados && <FormularioProduto key={produto.dados.id} inicial={produto.dados} lotes={lotes} />}
    </div>
  )
}
