import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Toast from '../components/Toast'
import CollapsibleSection from '../components/CollapsibleSection'
import API_URL from '../services/api'

type Category = {
  id: number
  name: string
}

type ToastType = 'success' | 'error' | 'warning' | 'info'

function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [toast, setToast] = useState<{
    message: string
    type: ToastType
  } | null>(null)

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })

    setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  async function loadCategories() {
    try {
      const response = await fetch(`${API_URL}/categories/`)

      if (!response.ok) {
        showToast(
          'Não foi possível carregar as categorias.',
          'error',
        )
        return
      }

      const data = await response.json()
      setCategories(data)
    } catch (error) {
      console.error(error)

      showToast(
        'Não foi possível carregar as categorias.',
        'error',
      )
    }
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  function handleCancel() {
    setName('')
    setShowForm(false)
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!name.trim()) {
      showToast('Informe o nome da categoria.', 'warning')
      return
    }

    try {
      const response = await fetch(`${API_URL}/categories/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(
          data.detail ??
            'Não foi possível cadastrar a categoria.',
          'error',
        )
        return
      }

      showToast(
        'Categoria cadastrada com sucesso!',
        'success',
      )

      handleCancel()
      await loadCategories()
    } catch (error) {
      console.error(error)

      showToast(
        'Não foi possível cadastrar a categoria.',
        'error',
      )
    }
  }

  return (
    <section className="categories-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1>Categorias</h1>
          <p>
            Gerencie as categorias dos produtos do estoque.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
        >
          Nova categoria
        </button>
      </div>

      {showForm && (
        <div className="products-card">
          <div className="table-header">
            <div>
              <h2>Cadastrar categoria</h2>
              <p>Informe o nome da nova categoria.</p>
            </div>

            <button
              type="button"
              onClick={handleCancel}
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="categoryName">
                Nome da categoria
              </label>

              <input
                id="categoryName"
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Ex.: Medicamentos"
              />
            </div>

            <button type="submit">
              Cadastrar categoria
            </button>
          </form>
        </div>
      )}

      <CollapsibleSection
        title="Categorias cadastradas"
        description={`${categories.length} categorias encontradas.`}
      >
        {categories.length === 0 ? (
          <p>Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Categoria</th>
                </tr>
              </thead>

              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>{category.id}</td>

                    <td>
                      <strong>{category.name}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>
    </section>
  )
}

export default Categories
