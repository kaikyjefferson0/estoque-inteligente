import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, MENSAGEM_ACORDANDO, mensagemDeErro } from '../api/client'
import { CONTA_DEMO, type ContaDemo } from '../auth/demo'
import { useAuth } from '../auth/useAuth'
import { Aviso } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { AnuncioDeErros } from '../components/AnuncioDeErros'
import { Campo } from '../components/Campo'
import { useErrosDoFormulario, type ErrosDeCampo } from '../components/useErrosDoFormulario'
import { useTituloDaPagina } from '../components/useTituloDaPagina'
import './LoginPage.css'

// Ordem dos campos na tela: o foco vai para o primeiro inválido
const CAMPOS = ['email', 'senha'] as const
type CampoLogin = (typeof CAMPOS)[number]

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validar(email: string, senha: string): ErrosDeCampo<CampoLogin> {
  const erros: ErrosDeCampo<CampoLogin> = {}
  if (!email.trim()) erros.email = 'Informe o e-mail.'
  else if (!EMAIL_VALIDO.test(email.trim())) erros.email = 'Informe um e-mail válido, como nome@empresa.com.'
  if (!senha) erros.senha = 'Informe a senha.'
  return erros
}

export function LoginPage({ contaDemo = CONTA_DEMO }: { contaDemo?: ContaDemo | null }) {
  useTituloDaPagina('Entrar')
  const { usuario, entrar, senhaTrocada } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const estado = location.state as { de?: string; expirou?: boolean } | null

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const { erros, anuncio, limpar, mostrar } = useErrosDoFormulario(CAMPOS)
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  // Qual botão está entrando: o do formulário ou o da demonstração
  const [enviando, setEnviando] = useState<'formulario' | 'demo' | null>(null)
  // Partida a frio no Render: a API está acordando e o login tenta de novo sozinho
  const [acordando, setAcordando] = useState(false)

  if (usuario) return <Navigate to={estado?.de ?? '/'} replace />

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const form = evento.currentTarget
    setErroGeral(null)
    if (!mostrar(form, validar(email, senha))) return
    await entrarCom(email.trim(), senha, 'formulario', form)
  }

  async function entrarComoDemonstracao() {
    if (!contaDemo) return
    setErroGeral(null)
    limpar('email')
    limpar('senha')
    await entrarCom(contaDemo.email, contaDemo.senha, 'demo')
  }

  async function entrarCom(emailUsado: string, senhaUsada: string, botao: 'formulario' | 'demo', form?: HTMLFormElement) {
    setEnviando(botao)
    try {
      await entrar(emailUsado, senhaUsada, () => setAcordando(true))
      navigate(estado?.de ?? '/', { replace: true })
    } catch (erro) {
      // RN-03: a API devolve a mesma mensagem genérica para qualquer falha de login
      if (erro instanceof ApiError && erro.status === 401) {
        setErroGeral(`${erro.message}. Confira os dados e tente de novo.`)
      } else if (erro instanceof ApiError && erro.status === 429) {
        // RN-47: a API já diz quanto esperar
        setErroGeral(erro.message)
      } else if (form && erro instanceof ApiError && Object.keys(erro.campos).length > 0) {
        // 422: o formulário OAuth2 chama os campos de username e password
        mostrar(form, { email: erro.campos.username, senha: erro.campos.password })
        setErroGeral(erro.message)
      } else {
        setErroGeral(mensagemDeErro(erro))
      }
      setAcordando(false)
      setEnviando(null)
    }
  }

  return (
    <div className="login">
      <main className="login__painel">
        <p className="login__marca">
          <span className="marca__etiqueta" aria-hidden />
          Estoque Inteligente
        </p>
        <div className="login__titulo">
          <h1>Entrar</h1>
          <p className="login__apoio">Use o e-mail e a senha cadastrados pelo administrador.</p>
        </div>

        {senhaTrocada && !erroGeral && (
          <Aviso situacao="ok">
            <p>Senha trocada. Entre com a nova senha.</p>
          </Aviso>
        )}
        {estado?.expirou && !erroGeral && (
          <Aviso situacao="atencao">
            <p>Sua sessão expirou. Entre de novo para continuar.</p>
          </Aviso>
        )}
        {acordando && enviando && (
          <Aviso situacao="atencao">
            <p>{MENSAGEM_ACORDANDO}</p>
          </Aviso>
        )}
        {erroGeral && (
          <Aviso situacao="critico">
            <p>{erroGeral}</p>
          </Aviso>
        )}

        <form className="login__form" onSubmit={aoEnviar} noValidate>
          <AnuncioDeErros mensagem={anuncio} />
          <Campo
            rotulo="E-mail"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              limpar('email')
            }}
            erro={erros.email}
          />
          <Campo
            rotulo="Senha"
            type={mostrarSenha ? 'text' : 'password'}
            name="senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value)
              limpar('senha')
            }}
            erro={erros.senha}
            acessorio={
              <button
                type="button"
                className="botao-icone campo__acessorio"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
              >
                {mostrarSenha ? <IconEyeOff aria-hidden /> : <IconEye aria-hidden />}
              </button>
            }
          />
          <Botao
            type="submit"
            variante="primaria"
            larguraTotal
            carregando={enviando === 'formulario'}
            disabled={enviando === 'demo'}
            textoCarregando="Entrando…"
          >
            Entrar
          </Botao>
        </form>

        {contaDemo && (
          <section className="login__demo" aria-labelledby="login-demo">
            <h2 id="login-demo" className="login__demo-titulo">
              Só quer conhecer o sistema?
            </h2>
            <p className="login__apoio">
              Entre como operador numa conta de demonstração, com dados de exemplo. Tudo o que você mudar volta ao original
              uma vez por dia.
            </p>
            <Botao
              type="button"
              variante="secundaria"
              larguraTotal
              onClick={entrarComoDemonstracao}
              carregando={enviando === 'demo'}
              disabled={enviando === 'formulario'}
              textoCarregando="Entrando…"
            >
              Entrar como demonstração
            </Botao>
          </section>
        )}
      </main>
    </div>
  )
}
