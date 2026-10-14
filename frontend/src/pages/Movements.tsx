import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Toast from '../components/Toast'
import CollapsibleSection from '../components/CollapsibleSection'
import API_URL from '../services/api'

type Movement = {
  id: number
  product_id: number
  lot_id: number | null
  user_id: number
  user_name: string
  movement_type: string
  quantity: number
  reason: string | null
  created_at: string
}

type Product = {
  id: number
  name: string
  barcode: string
}

type Lot = {
  id: number
  product_id: number
  lot_code: string
}

type MovementFilter =
  | 'todos'
  | 'entrada'
  | 'saida'
  | 'ajuste'

function Movements() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<MovementFilter>('todos')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    barcode: '',
    lot_id: '',
    movement_type: 'entrada',
    quantity: '',
    reason: '',
  })

  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  } | null>(null)

  async function loadMovements() {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setToast({
        message: 'Faça login para continuar.',
        type: 'error',
      })
      return
    }

    try {
      const response = await fetch(`${API_URL}/movements/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(
          'Não foi possível carregar as movimentações.',
        )
      }

      setMovements(await response.json())
    } catch (error) {
      console.error(error)
      setToast({
        message: 'Não foi possível carregar as movimentações.',
        type: 'error',
      })
    }
  }

  async function loadProducts() {
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/products/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Não foi possível carregar os produtos.')
      }

      setProducts(await response.json())
    } catch (error) {
      console.error(error)
      setToast({
        message: 'Não foi possível carregar os produtos.',
        type: 'error',
      })
    }
  }

  async function loadLots() {
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/lots/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Não foi possível carregar os lotes.')
      }

      setLots(await response.json())
    } catch (error) {
      console.error(error)
      setToast({
        message: 'Não foi possível carregar os lotes.',
        type: 'error',
      })
    }
  }

  useEffect(() => {
    loadMovements()
    loadProducts()
    loadLots()
  }, [])

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const token = localStorage.getItem('access_token')

    if (!token) {
      setToast({
        message: 'Faça login para continuar.',
        type: 'error',
      })
      return
    }

    if (!form.barcode.trim()) {
      setToast({
        message: 'Informe o código de barras.',
        type: 'warning',
      })
      return
    }

    const quantity = Number(form.quantity)

    if (
      !form.quantity.trim() ||
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      (form.movement_type !== 'ajuste' && quantity === 0)
    ) {
      setToast({
        message:
          form.movement_type === 'ajuste'
            ? 'A quantidade do ajuste deve ser igual ou maior que zero.'
            : 'A quantidade deve ser maior que zero.',
        type: 'warning',
      })
      return
    }

    if (
      (form.movement_type === 'entrada' ||
        form.movement_type === 'ajuste') &&
      !form.lot_id
    ) {
      setToast({
        message: 'Selecione um lote para essa movimentação.',
        type: 'warning',
      })
      return
    }

    if (
      form.movement_type === 'ajuste' &&
      !form.reason.trim()
    ) {
      setToast({
        message: 'Informe o motivo do ajuste.',
        type: 'warning',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/movements/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barcode: form.barcode.trim(),
          lot_id: form.lot_id ? Number(form.lot_id) : null,
          movement_type: form.movement_type,
          quantity,
          reason: form.reason.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ??
            'Não foi possível registrar a movimentação.',
        )
      }

      const messages: Record<string, string> = {
        entrada: 'Entrada de estoque registrada com sucesso!',
        saida: 'Saída de estoque registrada com sucesso!',
        ajuste: 'Ajuste de estoque registrado com sucesso!',
      }

      setToast({
        message:
          messages[form.movement_type] ??
          'Movimentação registrada com sucesso!',
        type: 'success',
      })

      setForm({
        barcode: '',
        lot_id: '',
        movement_type: 'entrada',
        quantity: '',
        reason: '',
      })

      await Promise.all([loadMovements(), loadLots()])
    } catch (error) {
      console.error(error)
      setToast({
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível registrar a movimentação.',
        type: 'error',
      })
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

  function getProductBarcode(productId: number) {
    return (
      products.find((product) => product.id === productId)?.barcode ??
      ''
    )
  }

  function getLotCode(lotId: number | null) {
    if (lotId === null) return '-'

    return (
      lots.find((lot) => lot.id === lotId)?.lot_code ??
      `Lote #${lotId}`
    )
  }

  function getMovementLabel(type: string) {
    if (type === 'entrada') return 'Entrada'
    if (type === 'saida') return 'Saída'
    if (type === 'ajuste') return 'Ajuste'
    return type
  }

  function getMovementClass(type: string) {
    if (type === 'entrada') return 'movement-entrada'
    if (type === 'saida') return 'movement-saida'
    if (type === 'ajuste') return 'movement-ajuste'
    return ''
  }

  const filteredMovements = movements.filter((movement) => {
    const searchTerm = search.toLowerCase().trim()
    const productName = getProductName(movement.product_id)
    const barcode = getProductBarcode(movement.product_id)
    const lotCode = getLotCode(movement.lot_id)

    const matchesSearch =
      !searchTerm ||
      productName.toLowerCase().includes(searchTerm) ||
      barcode.toLowerCase().includes(searchTerm) ||
      movement.user_name.toLowerCase().includes(searchTerm) ||
      lotCode.toLowerCase().includes(searchTerm)

    if (!matchesSearch) return false

    return (
      filter === 'todos' ||
      movement.movement_type === filter
    )
  })

  const filterOptions = [
    {
      value: 'todos' as MovementFilter,
      label: 'Todas',
      count: movements.length,
      className: 'movement-filter-all',
    },
    {
      value: 'entrada' as MovementFilter,
      label: 'Entradas',
      count: movements.filter(
        (movement) => movement.movement_type === 'entrada',
      ).length,
      className: 'movement-filter-entry',
    },
    {
      value: 'saida' as MovementFilter,
      label: 'Saídas',
      count: movements.filter(
        (movement) => movement.movement_type === 'saida',
      ).length,
      className: 'movement-filter-exit',
    },
    {
      value: 'ajuste' as MovementFilter,
      label: 'Ajustes',
      count: movements.filter(
        (movement) => movement.movement_type === 'ajuste',
      ).length,
      className: 'movement-filter-adjustment',
    },
  ]

  return (
    <div className="products-page movements-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1>Movimentações</h1>
          <p>
            Registre e consulte as movimentações do estoque.
          </p>
        </div>
      </div>

      <section className="products-card">
        <h2>Registrar movimentação</h2>
        <p>Informe os dados da movimentação.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="movement-barcode">
              Código de barras
            </label>
            <input
              id="movement-barcode"
              type="text"
              value={form.barcode}
              onChange={(event) =>
                setForm({
                  ...form,
                  barcode: event.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="movement-lot">Lote</label>
            <select
              id="movement-lot"
              value={form.lot_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  lot_id: event.target.value,
                })
              }
            >
              <option value="">Selecione um lote</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {getProductName(lot.product_id)} - {lot.lot_code}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="movement-type">Tipo</label>
            <select
              id="movement-type"
              value={form.movement_type}
              onChange={(event) =>
                setForm({
                  ...form,
                  movement_type: event.target.value,
                  lot_id: '',
                })
              }
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="movement-quantity">Quantidade</label>
            <input
              id="movement-quantity"
              type="number"
              min="0"
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
            <label htmlFor="movement-reason">Motivo</label>
            <input
              id="movement-reason"
              type="text"
              value={form.reason}
              onChange={(event) =>
                setForm({
                  ...form,
                  reason: event.target.value,
                })
              }
              placeholder="Obrigatório para ajuste"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading
              ? 'Registrando...'
              : 'Registrar movimentação'}
          </button>
        </form>
      </section>

      <CollapsibleSection
        title="Histórico de movimentações"
        description={`${filteredMovements.length} movimentação(ões) encontrada(s).`}
      >
        <div className="product-search">
          <label htmlFor="movement-search">
            Buscar movimentação
          </label>
          <input
            id="movement-search"
            type="text"
            placeholder="Produto, código de barras, lote ou usuário..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="movement-filter-cards">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`movement-filter-card ${option.className} ${
                filter === option.value ? 'active' : ''
              }`}
              onClick={() => setFilter(option.value)}
            >
              <span className="movement-filter-card-label">
                {option.label}
              </span>
              <strong>{option.count}</strong>
            </button>
          ))}
        </div>

        {filteredMovements.length === 0 ? (
          <p className="dashboard-empty">
            Nenhuma movimentação encontrada.
          </p>
        ) : (
          <div className="table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th>Tipo</th>
                  <th>Quantidade</th>
                  <th>Usuário</th>
                  <th>Data</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{movement.id}</td>
                    <td>
                      <strong>
                        {getProductName(movement.product_id)}
                      </strong>
                    </td>
                    <td>{getLotCode(movement.lot_id)}</td>
                    <td>
                      <span
                        className={`movement-badge ${getMovementClass(
                          movement.movement_type,
                        )}`}
                      >
                        {getMovementLabel(movement.movement_type)}
                      </span>
                    </td>
                    <td>{movement.quantity}</td>
                    <td>{movement.user_name}</td>
                    <td>
                      {new Date(movement.created_at).toLocaleString(
                        'pt-BR',
                      )}
                    </td>
                    <td>{movement.reason ?? '-'}</td>
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

export default Movements
