import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Toast from '../components/Toast'
import CollapsibleSection from '../components/CollapsibleSection'
import API_URL from '../services/api'

type Lot = {
  id: number
  product_id: number
  lot_code: string
  quantity: number
  expiration_date: string | null
}

type Product = {
  id: number
  name: string
  controls_expiration: boolean
}

type LotFilter =
  | 'todos'
  | 'com_estoque'
  | 'sem_estoque'
  | 'proximo_vencimento'
  | 'vencido'

type ToastType = 'success' | 'error' | 'warning' | 'info'

function Lots() {
  const [lots, setLots] = useState<Lot[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<LotFilter>('todos')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    product_id: '',
    lot_code: '',
    quantity: '',
    expiration_date: '',
  })

  const [toast, setToast] = useState<{
    message: string
    type: ToastType
  } | null>(null)

  function showToast(message: string, type: ToastType) {
    setToast({ message, type })
  }

  async function loadLots() {
    const token = localStorage.getItem('access_token')

    if (!token) {
      showToast('Faça login para continuar.', 'error')
      return
    }

    try {
      const response = await fetch(`${API_URL}/lots/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Não foi possível carregar os lotes.')
      }

      const data = await response.json()
      setLots(data)
    } catch (error) {
      console.error(error)
      showToast('Não foi possível carregar os lotes.', 'error')
    }
  }

  async function loadProducts() {
    const token = localStorage.getItem('access_token')

    if (!token) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/products/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Não foi possível carregar os produtos.')
      }

      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error(error)

      showToast(
        'Não foi possível carregar os produtos.',
        'error',
      )
    }
  }

  useEffect(() => {
    void loadLots()
    void loadProducts()
  }, [])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const token = localStorage.getItem('access_token')

    if (!token) {
      showToast('Faça login para continuar.', 'error')
      return
    }

    if (!form.product_id) {
      showToast('Selecione um produto.', 'warning')
      return
    }

    if (!form.lot_code.trim()) {
      showToast('Informe o código do lote.', 'warning')
      return
    }

    if (
      !form.quantity.trim() ||
      !Number.isFinite(Number(form.quantity)) ||
      Number(form.quantity) <= 0
    ) {
      showToast(
        'A quantidade deve ser maior que zero.',
        'warning',
      )
      return
    }

    const selectedProduct = products.find(
      (product) => product.id === Number(form.product_id),
    )

    if (
      selectedProduct?.controls_expiration &&
      !form.expiration_date
    ) {
      showToast(
        'Este produto controla validade. Informe a data de validade.',
        'warning',
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/lots/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: Number(form.product_id),
          lot_code: form.lot_code.trim(),
          quantity: Number(form.quantity),
          expiration_date: form.expiration_date || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ?? 'Não foi possível cadastrar o lote.',
        )
      }

      showToast('Lote cadastrado com sucesso!', 'success')

      setForm({
        product_id: '',
        lot_code: '',
        quantity: '',
        expiration_date: '',
      })

      await loadLots()
    } catch (error) {
      console.error(error)

      showToast(
        error instanceof Error
          ? error.message
          : 'Não foi possível cadastrar o lote.',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }

  function getProductName(productId: number) {
    return (
      products.find((product) => product.id === productId)?.name ??
      `Produto #${productId}`
    )
  }

  function getExpirationStatus(lot: Lot) {
    if (!lot.expiration_date) {
      return 'sem_validade'
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const expirationDate = new Date(
      `${lot.expiration_date.slice(0, 10)}T00:00:00`,
    )

    if (Number.isNaN(expirationDate.getTime())) {
      return 'sem_validade'
    }

    const difference =
      expirationDate.getTime() - today.getTime()

    const days = Math.ceil(
      difference / (1000 * 60 * 60 * 24),
    )

    if (days < 0) {
      return 'vencido'
    }

    if (days <= 30) {
      return 'proximo_vencimento'
    }

    return 'normal'
  }

  const filteredLots = lots.filter((lot) => {
    const searchTerm = search.toLowerCase().trim()

    const matchesSearch =
      !searchTerm ||
      lot.lot_code.toLowerCase().includes(searchTerm) ||
      getProductName(lot.product_id)
        .toLowerCase()
        .includes(searchTerm)

    if (!matchesSearch) {
      return false
    }

    if (filter === 'com_estoque') {
      return lot.quantity > 0
    }

    if (filter === 'sem_estoque') {
      return lot.quantity <= 0
    }

    if (filter === 'proximo_vencimento') {
      return getExpirationStatus(lot) === 'proximo_vencimento'
    }

    if (filter === 'vencido') {
      return getExpirationStatus(lot) === 'vencido'
    }

    return true
  })

  const selectedProduct = products.find(
    (product) => product.id === Number(form.product_id),
  )

  const filterOptions: {
    value: LotFilter
    label: string
    count: number
    className: string
  }[] = [
    {
      value: 'todos',
      label: 'Todos',
      count: lots.length,
      className: 'lot-filter-all',
    },
    {
      value: 'com_estoque',
      label: 'Com estoque',
      count: lots.filter((lot) => lot.quantity > 0).length,
      className: 'lot-filter-stock',
    },
    {
      value: 'sem_estoque',
      label: 'Sem estoque',
      count: lots.filter((lot) => lot.quantity <= 0).length,
      className: 'lot-filter-empty',
    },
    {
      value: 'proximo_vencimento',
      label: 'Próximo do vencimento',
      count: lots.filter(
        (lot) => getExpirationStatus(lot) === 'proximo_vencimento',
      ).length,
      className: 'lot-filter-warning',
    },
    {
      value: 'vencido',
      label: 'Vencidos',
      count: lots.filter(
        (lot) => getExpirationStatus(lot) === 'vencido',
      ).length,
      className: 'lot-filter-expired',
    },
  ]

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
          <h1>Lotes</h1>
          <p>
            Controle as quantidades e validades dos lotes.
          </p>
        </div>
      </div>

      <section className="products-card">
        <h2>Cadastrar lote</h2>
        <p>Informe os dados do novo lote.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="lot-product">Produto</label>

            <select
              id="lot-product"
              value={form.product_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  product_id: event.target.value,
                  expiration_date: '',
                })
              }
              required
            >
              <option value="">Selecione um produto</option>

              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="lot-code">Código do lote</label>

            <input
              id="lot-code"
              type="text"
              value={form.lot_code}
              onChange={(event) =>
                setForm({
                  ...form,
                  lot_code: event.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="lot-quantity">Quantidade</label>

            <input
              id="lot-quantity"
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={(event) =>
                setForm({
                  ...form,
                  quantity: event.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="expiration-date">
              Data de validade
            </label>

            <input
              id="expiration-date"
              type="date"
              value={form.expiration_date}
              onChange={(event) =>
                setForm({
                  ...form,
                  expiration_date: event.target.value,
                })
              }
              required={Boolean(
                selectedProduct?.controls_expiration,
              )}
            />

            {selectedProduct?.controls_expiration && (
              <small>
                Este produto exige data de validade.
              </small>
            )}

            {!selectedProduct?.controls_expiration &&
              form.product_id && (
                <small>
                  A validade é opcional para este produto.
                </small>
              )}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar lote'}
          </button>
        </form>
      </section>

      <CollapsibleSection
        title="Lotes cadastrados"
        description={`${filteredLots.length} lote(s) encontrado(s).`}
      >
        <div className="product-search">
          <label htmlFor="lot-search">Buscar lote</label>

          <input
            id="lot-search"
            type="text"
            placeholder="Código do lote ou nome do produto..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="lot-filter-cards">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`lot-filter-card ${option.className} ${
                filter === option.value ? 'active' : ''
              }`}
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
            >
              <span className="lot-filter-card-label">
                {option.label}
              </span>

              <strong>{option.count}</strong>
            </button>
          ))}
        </div>

        {filteredLots.length === 0 ? (
          <p className="dashboard-empty">
            Nenhum lote encontrado.
          </p>
        ) : (
          <div className="table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th>Quantidade</th>
                  <th>Validade</th>
                </tr>
              </thead>

              <tbody>
                {filteredLots.map((lot) => (
                  <tr key={lot.id}>
                    <td>
                      <strong>
                        {getProductName(lot.product_id)}
                      </strong>
                    </td>

                    <td>{lot.lot_code}</td>
                    <td>{lot.quantity}</td>

                    <td>
                      {lot.expiration_date
                        ? lot.expiration_date.slice(0, 10)
                        : 'Sem validade'}
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

export default Lots
