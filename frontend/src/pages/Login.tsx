import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import Toast from '../components/Toast'
import API_URL from '../services/api'

type ToastType = 'success' | 'error' | 'warning' | 'info'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const [toast, setToast] = useState<{
    message: string
    type: ToastType
  } | null>(null)

  const navigate = useNavigate()

  function showToast(message: string, type: ToastType) {
    setToast({
      message,
      type,
    })

    setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(
          data.detail ?? 'E-mail ou senha inválidos.',
          'error',
        )
        return
      }

      localStorage.setItem('access_token', data.access_token)

      showToast('Login realizado com sucesso!', 'success')

      setTimeout(() => {
        navigate('/')
      }, 800)
    } catch (error) {
      console.error(error)

      showToast(
        'Não foi possível conectar ao servidor.',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="login-card">
        <div className="login-header">
          <h1>Estoque Inteligente</h1>
          <p>Entre na sua conta para continuar.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">E-mail</label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Digite seu e-mail"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Digite sua senha"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default Login
