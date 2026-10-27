import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, mensagemDeErro } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { Aviso } from '../components/Aviso'
import { Botao } from '../components/Botao'
import { Campo } from '../components/Campo'
import './LoginPage.css'

interface Erros {
  email?: string
  senha?: string
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validar(email: string, senha: string): Erros {
  const erros: Erros = {}
  if (!email.trim()) erros.email = 'Informe o e-mail.'
  else if (!EMAIL_VALIDO.test(email.trim())) erros.email = 'Informe um e-mail válido, como nome@empresa.com.'
  if (!senha) erros.senha = 'Informe a senha.'
  return erros
}

export function LoginPage() {
  const { usuario, entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const estado = location.state as { de?: string; expirou?: boolean } | null

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erros, setErros] = useState<Erros>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (usuario) return <Navigate to={estado?.de ?? '/'} replace />

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const encontrados = validar(email, senha)
    setErros(encontrados)
    setErroGeral(null)
    if (encontrados.email || encontrados.senha) return

    setEnviando(true)
    try {
      await entrar(email.trim(), senha)
      navigate(estado?.de ?? '/', { replace: true })
    } catch (erro) {
      // RN-03: a API devolve a mesma mensagem genérica para qualquer falha de login
      if (erro instanceof ApiError && erro.status === 401) {
        setErroGeral(`${erro.message}. Confira os dados e tente de novo.`)
      } else {
        setErroGeral(mensagemDeErro(erro))
      }
      setEnviando(false)
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

        {estado?.expirou && !erroGeral && (
          <Aviso situacao="atencao">
            <p>Sua sessão expirou. Entre de novo para continuar.</p>
          </Aviso>
        )}
        {erroGeral && (
          <Aviso situacao="critico">
            <p>{erroGeral}</p>
          </Aviso>
        )}

        <form className="login__form" onSubmit={aoEnviar} noValidate>
          <Campo
            rotulo="E-mail"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erro={erros.email}
          />
          <Campo
            rotulo="Senha"
            type={mostrarSenha ? 'text' : 'password'}
            name="senha"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
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
          <Botao type="submit" variante="primaria" larguraTotal carregando={enviando} textoCarregando="Entrando…">
            Entrar
          </Botao>
        </form>
      </main>
    </div>
  )
}
