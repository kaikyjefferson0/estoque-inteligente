import { IconLock } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, api, mensagemDeErro } from '../api/client'
import { useRecurso } from '../api/useRecurso'
import { useAuth } from '../auth/useAuth'
import { AnuncioDeErros } from '../components/AnuncioDeErros'
import { Aviso } from '../components/Aviso'
import { Botao, BotaoLink } from '../components/Botao'
import { CaixaDeMarcar } from '../components/CaixaDeMarcar'
import { Campo } from '../components/Campo'
import { CampoSelecao } from '../components/CampoSelecao'
import { ConfirmarDialogo } from '../components/ConfirmarDialogo'
import { Carregando, ErroEstado } from '../components/Estados'
import { useErrosDoFormulario, type ErrosDeCampo } from '../components/useErrosDoFormulario'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import { NOME_DO_PERFIL, type Perfil, type Usuario } from '../types/auth'
import { SENHA_MAXIMA, SENHA_MINIMA } from '../utils/senha'
import './UsuariosPage.css'

// Ordem dos campos na tela: o foco vai para o primeiro inválido
const CAMPOS = ['nome', 'email', 'senha', 'confirmacao', 'perfil', 'ativo'] as const
type CampoUsuario = (typeof CAMPOS)[number]

const MAX_NOME = 120
const MAX_EMAIL = 254
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// RN-22: motivo mostrado quando o admin abre o próprio cadastro
const ID_MOTIVO = 'motivo-proprio-usuario'
const MOTIVO_PROPRIO = 'Você não pode mudar o próprio perfil nem se desativar, para o sistema nunca ficar sem administrador.'

interface Valores {
  nome: string
  email: string
  senha: string
  confirmacao: string
}

function validar(valores: Valores, novo: boolean): ErrosDeCampo<CampoUsuario> {
  const erros: ErrosDeCampo<CampoUsuario> = {}
  const nome = valores.nome.trim()
  if (!nome) erros.nome = 'Informe o nome do usuário.'
  else if (nome.length > MAX_NOME) erros.nome = `Use até ${MAX_NOME} caracteres no nome.`
  if (!novo) return erros
  const email = valores.email.trim()
  if (!email) erros.email = 'Informe o e-mail.'
  else if (!EMAIL_VALIDO.test(email) || email.length > MAX_EMAIL) erros.email = 'Informe um e-mail válido, como nome@empresa.com.'
  if (!valores.senha) erros.senha = `Informe a senha, com pelo menos ${SENHA_MINIMA} caracteres.`
  else if (valores.senha.length < SENHA_MINIMA) erros.senha = `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`
  else if (valores.senha.length > SENHA_MAXIMA) erros.senha = `Use até ${SENHA_MAXIMA} caracteres na senha.`
  if (!valores.confirmacao) erros.confirmacao = 'Repita a senha para confirmar.'
  else if (valores.confirmacao !== valores.senha) erros.confirmacao = 'As senhas não são iguais. Digite a mesma senha nos dois campos.'
  return erros
}

function FormularioUsuario({ inicial }: { inicial?: Usuario }) {
  const navigate = useNavigate()
  const { usuario: logado, atualizarUsuario } = useAuth()
  const proprio = inicial !== undefined && inicial.id === logado?.id

  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  // Operador por padrão: o menor acesso
  const [perfil, setPerfil] = useState<Perfil>(inicial?.perfil ?? 'operador')
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true)
  const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmando, setConfirmando] = useState<HTMLFormElement | null>(null)

  async function salvar(form: HTMLFormElement) {
    setEnviando(true)
    try {
      if (inicial) {
        // Na edição, envia só o que mudou (o e-mail nunca muda)
        const valores = { nome: nome.trim(), perfil, ativo }
        const corpo = Object.fromEntries(Object.entries(valores).filter(([campo, valor]) => inicial[campo as keyof Usuario] !== valor))
        const salvo = await api<Usuario>(`/users/${inicial.id}`, { method: 'PATCH', body: corpo })
        if (proprio) atualizarUsuario(salvo)
        const mensagem = inicial.ativo && !salvo.ativo ? `Usuário desativado: ${salvo.nome} não consegue mais entrar` : 'Alterações salvas'
        navigate('/usuarios', { state: { mensagem } })
      } else {
        await api<Usuario>('/users', { body: { nome: nome.trim(), email: email.trim(), senha, perfil } })
        navigate('/usuarios', { state: { mensagem: 'Usuário cadastrado' } })
      }
    } catch (erro) {
      setEnviando(false)
      setConfirmando(null)
      if (erro instanceof ApiError && erro.status === 409 && !inicial) {
        // E-mail repetido aparece no próprio campo
        mostrar(form, { email: 'Este e-mail já está cadastrado. Use outro e-mail.' })
      } else if (erro instanceof ApiError && Object.keys(erro.campos).length > 0) {
        mostrar(form, erro.campos)
        setErroGeral(erro.message)
      } else {
        // Inclui o 409 da RN-22, com a mensagem da API
        setErroGeral(mensagemDeErro(erro))
      }
    }
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = evento.currentTarget
    setErroGeral(null)
    if (!mostrar(form, validar({ nome, email, senha, confirmacao }, !inicial))) return
    // Desativar é a ação que tira o acesso: pede confirmação antes
    if (inicial?.ativo && !ativo) return setConfirmando(form)
    void salvar(form)
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
        autoComplete="off"
        autoFocus={!inicial}
        maxLength={MAX_NOME}
        value={nome}
        onChange={(e) => {
          setNome(e.target.value)
          limpar('nome')
        }}
        erro={erros.nome}
      />
      {inicial ? (
        // Texto, não campo: o e-mail longo aparece inteiro, quebrando a linha (é o detalhe do usuário)
        <div className="campo">
          <p className="campo__rotulo">E-mail</p>
          <p className="texto-inteiro">{email}</p>
          <p className="campo__dica">O e-mail é o login e não pode ser alterado.</p>
        </div>
      ) : (
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          autoComplete="off"
          spellCheck={false}
          maxLength={MAX_EMAIL}
          dica="É com ele que a pessoa entra no sistema."
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            limpar('email')
          }}
          erro={erros.email}
        />
      )}
      {!inicial && (
        <div className="formulario__grupo">
          <Campo
            rotulo="Senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            maxLength={SENHA_MAXIMA}
            dica={erros.senha ? undefined : `Pelo menos ${SENHA_MINIMA} caracteres.`}
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value)
              limpar('senha')
              limpar('confirmacao')
            }}
            erro={erros.senha}
          />
          <Campo
            rotulo="Confirme a senha"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            maxLength={SENHA_MAXIMA}
            value={confirmacao}
            onChange={(e) => {
              setConfirmacao(e.target.value)
              limpar('confirmacao')
            }}
            erro={erros.confirmacao}
          />
        </div>
      )}
      <div className="formulario__grupo">
        {/* RN-22: um único motivo para os dois campos bloqueados, lido pelos dois */}
        {proprio && (
          <p id={ID_MOTIVO} className="usuario-form__motivo">
            <IconLock aria-hidden />
            <span>{MOTIVO_PROPRIO}</span>
          </p>
        )}
        <CampoSelecao
          rotulo="Perfil"
          name="perfil"
          value={perfil}
          disabled={proprio}
          {...(proprio && { 'aria-describedby': ID_MOTIVO })}
          dica={proprio ? undefined : 'O administrador também faz ajustes e cuida dos usuários.'}
          onChange={(e) => {
            setPerfil(e.target.value as Perfil)
            limpar('perfil')
          }}
          erro={erros.perfil}
        >
          <option value="operador">{NOME_DO_PERFIL.operador}</option>
          <option value="admin">{NOME_DO_PERFIL.admin}</option>
        </CampoSelecao>
        {inicial && (
          <CaixaDeMarcar
            rotulo="Usuário ativo"
            name="ativo"
            checked={ativo}
            disabled={proprio}
            {...(proprio && { 'aria-describedby': ID_MOTIVO })}
            dica={proprio ? undefined : 'Usuário inativo não consegue entrar. As movimentações registradas continuam no histórico.'}
            onChange={(e) => {
              setAtivo(e.target.checked)
              limpar('ativo')
            }}
            erro={erros.ativo}
          />
        )}
      </div>
      <div className="formulario__acoes">
        <Botao type="submit" variante="primaria" carregando={enviando} textoCarregando={inicial ? 'Salvando…' : 'Cadastrando…'}>
          {inicial ? 'Salvar alterações' : 'Cadastrar usuário'}
        </Botao>
        <BotaoLink to="/usuarios" variante="fantasma">
          Cancelar
        </BotaoLink>
      </div>

      {inicial && (
        <ConfirmarDialogo
          aberto={confirmando !== null}
          aoMudar={(aberto) => !aberto && !enviando && setConfirmando(null)}
          titulo={`Desativar ${inicial.nome}?`}
          descricao="O acesso ao sistema é bloqueado na hora. As movimentações já registradas continuam no histórico, e você pode reativar o usuário depois."
          textoConfirmar="Desativar usuário"
          perigo
          carregando={enviando}
          aoConfirmar={() => confirmando && void salvar(confirmando)}
        />
      )}
    </form>
  )
}

export function UsuarioNovoPage() {
  useTituloDaPagina('Cadastrar usuário')
  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Cadastrar usuário</h1>
          <p className="pagina__apoio">A pessoa entra com o e-mail e a senha que você definir.</p>
        </div>
      </header>
      <FormularioUsuario />
    </div>
  )
}

export function UsuarioEditarPage() {
  useTituloDaPagina('Editar usuário')
  const { id } = useParams()
  const { dados, erro, carregando, recarregar } = useRecurso<Usuario>(`/users/${id}`)

  return (
    <div className="pagina">
      <header className="pagina__cabecalho">
        <div>
          <h1>Editar usuário</h1>
          {dados && <p className="pagina__apoio">{dados.nome}</p>}
        </div>
      </header>
      {!dados && carregando && <Carregando texto="Carregando usuário…" />}
      {erro && <ErroEstado mensagem={erro} aoTentarDeNovo={recarregar} />}
      {dados && <FormularioUsuario key={dados.id} inicial={dados} />}
    </div>
  )
}
