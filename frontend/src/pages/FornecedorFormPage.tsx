import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, api, mensagemDeErro } from '../api/client'
import { useRecurso } from '../api/useRecurso'
import { AnuncioDeErros } from '../components/AnuncioDeErros'
import { Aviso } from '../components/Aviso'
import { Botao, BotaoLink } from '../components/Botao'
import { Campo } from '../components/Campo'
import { Carregando, ErroEstado } from '../components/Estados'
import { useErrosDoFormulario, type ErrosDeCampo } from '../components/useErrosDoFormulario'
import type { Fornecedor } from '../types/fornecedor'
import { formatarCnpj, somenteDigitos } from '../utils/formato'

// Ordem dos campos na tela: o foco vai para o primeiro inválido
const CAMPOS = ['nome', 'cnpj'] as const
type CampoFornecedor = (typeof CAMPOS)[number]

const MAX_NOME = 120

function validar(nome: string, cnpj: string): ErrosDeCampo<CampoFornecedor> {
  const erros: ErrosDeCampo<CampoFornecedor> = {}
  // RN-06: só o nome é obrigatório
  if (!nome.trim()) erros.nome = 'Informe o nome do fornecedor.'
  else if (nome.trim().length > MAX_NOME) erros.nome = `Use até ${MAX_NOME} caracteres no nome.`
  // RN-25: quando informado, o CNPJ tem 14 números
  const digitos = somenteDigitos(cnpj)
  if (digitos.length > 0 && digitos.length < 14) {
    const faltam = 14 - digitos.length
    erros.cnpj = `O CNPJ tem 14 números; ${faltam === 1 ? 'falta 1' : `faltam ${faltam}`}. Complete ou deixe em branco.`
  }
  return erros
}

function FormularioFornecedor({ inicial }: { inicial?: Fornecedor }) {
  const navigate = useNavigate()
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [cnpj, setCnpj] = useState(inicial?.cnpj ? formatarCnpj(inicial.cnpj) : '')
  const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = evento.currentTarget
    setErroGeral(null)
    if (!mostrar(form, validar(nome, cnpj))) return

    // Envia só os números; vazio vira null (sem CNPJ)
    const valores = { nome: nome.trim(), cnpj: somenteDigitos(cnpj) || null }
    // Na edição, envia só o que mudou
    const corpo = inicial
      ? Object.fromEntries(Object.entries(valores).filter(([campo, valor]) => inicial[campo as CampoFornecedor] !== valor))
      : valores

    setEnviando(true)
    try {
      if (inicial) await api<Fornecedor>(`/suppliers/${inicial.id}`, { method: 'PATCH', body: corpo })
      else await api<Fornecedor>('/suppliers', { body: corpo })
      navigate('/fornecedores', { state: { mensagem: inicial ? 'Alterações salvas' : 'Fornecedor cadastrado' } })
    } catch (erro) {
      setEnviando(false)
      if (erro instanceof ApiError && erro.status === 409) {
        // RN-25: CNPJ repetido aparece no próprio campo
        mostrar(form, { cnpj: 'Este CNPJ já está cadastrado em outro fornecedor. Confira o número.' })
      } else if (erro instanceof ApiError && Object.keys(erro.campos).length > 0) {
        mostrar(form, erro.campos)
        setErroGeral(erro.message)
      } else {
        setErroGeral(mensagemDeErro(erro))
      }
    }
  }

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
        autoComplete="organization"
        autoFocus={!inicial}
        maxLength={MAX_NOME}
        value={nome}
        onChange={(e) => {
          setNome(e.target.value)
          limpar('nome')
        }}
        erro={erros.nome}
      />
      <Campo
        rotulo="CNPJ (opcional)"
        name="cnpj"
        inputMode="numeric"
        autoComplete="off"
        placeholder="00.000.000/0000-00"
        dica="Pode digitar ou colar com ou sem pontuação."
        className="numero"
        value={cnpj}
        onChange={(e) => {
          setCnpj(formatarCnpj(e.target.value))
          limpar('cnpj')
        }}
        erro={erros.cnpj}
      />
      <div className="formulario__acoes">
        <Botao type="submit" variante="primaria" carregando={enviando} textoCarregando={inicial ? 'Salvando…' : 'Cadastrando…'}>
          {inicial ? 'Salvar alterações' : 'Cadastrar fornecedor'}
        </Botao>
        <BotaoLink to="/fornecedores" variante="fantasma">
          Cancelar
        </BotaoLink>
      </div>
    </form>
  )
}

export function FornecedorNovoPage() {
  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Cadastrar fornecedor</h1>
          <p className="pagina__apoio">Só o nome é obrigatório.</p>
        </div>
      </header>
      <FormularioFornecedor />
    </div>
  )
}

export function FornecedorEditarPage() {
  const { id } = useParams()
  const { dados, erro, carregando, recarregar } = useRecurso<Fornecedor>(`/suppliers/${id}`)

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Editar fornecedor</h1>
          {dados && <p className="pagina__apoio">{dados.nome}</p>}
        </div>
      </header>
      {!dados && carregando && <Carregando texto="Carregando fornecedor…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}
      {dados && <FormularioFornecedor key={dados.id} inicial={dados} />}
    </div>
  )
}
