import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Toast from '../components/Toast'
import CollapsibleSection from '../components/CollapsibleSection'
import API_URL from '../services/api'

type User = {
  id: number
  name: string
  email: string
  role: string
  active: boolean
}

function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'operador',
  })
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<
    'todos' | 'admin' | 'operador'
  >('todos')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  } | null>(null)

  async function loadUsers() {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setToast({
        message: 'Faça login para continuar.',
        type: 'error',
      })
      return
    }

    try {
      const response = await fetch(`${API_URL}/users/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 403) {
        setToast({
          message:
            'Você não possui permissão para acessar os usuários.',
          type: 'error',
        })
        return
      }

      if (!response.ok) {
        throw new Error('Não foi possível carregar os usuários.')
      }

      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error(error)
      setToast({
        message: 'Não foi possível carregar os usuários.',
        type: 'error',
      })
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const token = localStorage.getItem('access_token')

    if (!token) {
      setToast({
        message: 'Faça login para continuar.',
        type: 'error',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (response.status === 403) {
        throw new Error(
          'Você não possui permissão para cadastrar usuários.',
        )
      }

      if (!response.ok) {
        throw new Error(
          data.detail ?? 'Não foi possível cadastrar o usuário.',
        )
      }

      setToast({
        message: 'Usuário cadastrado com sucesso!',
        type: 'success',
      })

      setForm({
        name: '',
        email: '',
        password: '',
        role: 'operador',
      })

      await loadUsers()
    } catch (error) {
      console.error(error)

      setToast({
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível cadastrar o usuário.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  function getRoleLabel(role: string) {
    if (role === 'admin') {
      return 'Administrador'
    }

    if (role === 'operador') {
      return 'Operador'
    }

    return role
  }

  function getRoleClass(role: string) {
    if (role === 'admin') {
      return 'user-role-admin'
    }

    if (role === 'operador') {
      return 'user-role-operator'
    }

    return 'user-role-neutral'
  }

  const filteredUsers = users.filter((user) => {
    const searchTerm = search.toLowerCase().trim()

    const matchesSearch =
      !searchTerm ||
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)

    if (!matchesSearch) {
      return false
    }

    if (roleFilter !== 'todos' && user.role !== roleFilter) {
      return false
    }

    return true
  })

  return (
    <div className="products-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1>Usuários</h1>
          <p>Gerencie os usuários e suas permissões.</p>
        </div>
      </div>

      <section className="products-card">
        <h2>Cadastrar usuário</h2>
        <p>Crie um novo usuário para acessar o sistema.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="user-name">Nome</label>
            <input
              id="user-name"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm({
                  ...form,
                  name: event.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-email">E-mail</label>
            <input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-password">Senha</label>
            <input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm({
                  ...form,
                  password: event.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="user-role">Perfil</label>
            <select
              id="user-role"
              value={form.role}
              onChange={(event) =>
                setForm({
                  ...form,
                  role: event.target.value,
                })
              }
            >
              <option value="operador">Operador</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar usuário'}
          </button>
        </form>
      </section>

      <CollapsibleSection
        title="Usuários cadastrados"
        description={`${filteredUsers.length} usuário(s) encontrado(s).`}
      >
        <div className="product-search">
          <label htmlFor="user-search">Buscar usuário</label>
          <input
            id="user-search"
            type="text"
            placeholder="Nome ou e-mail..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="lot-filters">
          <button
            type="button"
            className={`lot-filter ${
              roleFilter === 'todos' ? 'active' : ''
            }`}
            onClick={() => setRoleFilter('todos')}
          >
            Todos
          </button>

          <button
            type="button"
            className={`lot-filter ${
              roleFilter === 'admin' ? 'active' : ''
            }`}
            onClick={() => setRoleFilter('admin')}
          >
            Administradores
          </button>

          <button
            type="button"
            className={`lot-filter ${
              roleFilter === 'operador' ? 'active' : ''
            }`}
            onClick={() => setRoleFilter('operador')}
          >
            Operadores
          </button>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="dashboard-empty">
            Nenhum usuário encontrado.
          </p>
        ) : (
          <div className="table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>
                      <strong>{user.name}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span
                        className={`user-role-badge ${getRoleClass(
                          user.role,
                        )}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          user.active
                            ? 'status-active'
                            : 'status-inactive'
                        }
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}

export default Users
