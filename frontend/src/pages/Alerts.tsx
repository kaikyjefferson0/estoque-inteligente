import { useEffect, useRef, useState } from 'react'

import Toast from '../components/Toast'
import CollapsibleSection from '../components/CollapsibleSection'
import API_URL from '../services/api'

type Alert = {
  id: number
  product_id: number
  lot_id: number | null
  alert_type: string
  active: boolean
  created_at: string
}

type Product = {
  id: number
  name: string
}

type Lot = {
  id: number
  lot_code: string
}

type AlertFilter =
  | 'todos'
  | 'estoque_baixo'
  | 'proximo_vencimento'
  | 'vencido'

type ToastType = 'success' | 'error' | 'warning' | 'info'

function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [lots, setLots] = useState<Lot[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFilter, setSelectedFilter] =
    useState<AlertFilter>('todos')

  const [toast, setToast] = useState<{
    message: string
    type: ToastType
  } | null>(null)

  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  function showToast(message: string, type: ToastType) {
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current)
    }

    setToast({ message, type })

    toastTimeout.current = setTimeout(() => {
      setToast(null)
      toastTimeout.current = null
    }, 3500)
  }

  function getAuthHeaders(): HeadersInit | null {
    const token = localStorage.getItem('access_token')

    if (!token) {
      return null
    }

    return {
      Authorization: `Bearer ${token}`,
    }
  }

  async function loadAlerts(notify = true): Promise<boolean> {
    const headers = getAuthHeaders()

    if (!headers) {
      return false
    }

    try {
      const response = await fetch(`${API_URL}/alerts/`, {
        headers,
      })

      if (!response.ok) {
        throw new Error('Não foi possível carregar os alertas.')
      }

      setAlerts(await response.json())
      return true
    } catch (error) {
      console.error(error)

      if (notify) {
        showToast(
          'Não foi possível carregar os alertas.',
          'error',
        )
      }

      return false
    }
  }

  async function loadProducts() {
    const headers = getAuthHeaders()

    if (!headers) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/products/`, {
        headers,
      })

      if (!response.ok) {
        throw new Error('Não foi possível carregar os produtos.')
      }

      setProducts(await response.json())
    } catch (error) {
      console.error(error)

      showToast(
        'Não foi possível carregar os produtos.',
        'error',
      )
    }
  }

  async function loadLots() {
    const headers = getAuthHeaders()

    if (!headers) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/lots/`, {
        headers,
      })

      if (!response.ok) {
        throw new Error('Não foi possível carregar os lotes.')
      }

      setLots(await response.json())
    } catch (error) {
      console.error(error)

      showToast(
        'Não foi possível carregar os lotes.',
        'error',
      )
    }
  }

  async function loadData() {
    if (!getAuthHeaders()) {
      showToast('Faça login para continuar.', 'error')
      return
    }

    await Promise.all([
      loadAlerts(),
      loadProducts(),
      loadLots(),
    ])
  }

  async function generateAlerts() {
    const headers = getAuthHeaders()

    if (!headers) {
      showToast('Faça login para continuar.', 'error')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/alerts/generate`, {
        method: 'POST',
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(
          data.detail ?? 'Não foi possível atualizar os alertas.',
          'error',
        )
        return
      }

      const refreshed = await loadAlerts(false)

      if (!refreshed) {
        showToast(
          'Os alertas foram gerados, mas não foi possível atualizar a lista.',
          'warning',
        )
        return
      }

      showToast('Alertas atualizados com sucesso!', 'success')
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

  function getProductName(productId: number) {
    return (
      products.find((item) => item.id === productId)?.name ??
      `Produto #${productId}`
    )
  }

  function getLotCode(lotId: number | null) {
    if (lotId === null) {
      return '-'
    }

    return (
      lots.find((item) => item.id === lotId)?.lot_code ??
      `Lote #${lotId}`
    )
  }

  function getAlertLabel(type: string) {
    if (type === 'estoque_baixo') {
      return 'Estoque baixo'
    }

    if (type === 'proximo_vencimento') {
      return 'Próximo do vencimento'
    }

    if (type === 'vencido') {
      return 'Produto vencido'
    }

    return type
  }

  function getAlertClass(type: string) {
    if (type === 'estoque_baixo') {
      return 'alert-badge-low'
    }

    if (type === 'proximo_vencimento') {
      return 'alert-badge-warning'
    }

    if (type === 'vencido') {
      return 'alert-badge-expired'
    }

    return 'alert-badge-neutral'
  }

  const lowStockAlerts = alerts.filter(
    (alert) => alert.alert_type === 'estoque_baixo',
  )

  const nearExpirationAlerts = alerts.filter(
    (alert) => alert.alert_type === 'proximo_vencimento',
  )

  const expiredAlerts = alerts.filter(
    (alert) => alert.alert_type === 'vencido',
  )

  const filterOptions: {
    id: AlertFilter
    label: string
    count: number
    className: string
  }[] = [
    {
      id: 'todos',
      label: 'Todos',
      count: alerts.length,
      className: 'alert-filter-all',
    },
    {
      id: 'estoque_baixo',
      label: 'Estoque baixo',
      count: lowStockAlerts.length,
      className: 'alert-filter-low',
    },
    {
      id: 'proximo_vencimento',
      label: 'Próximos do vencimento',
      count: nearExpirationAlerts.length,
      className: 'alert-filter-warning',
    },
    {
      id: 'vencido',
      label: 'Vencidos',
      count: expiredAlerts.length,
      className: 'alert-filter-expired',
    },
  ]

  const filteredAlerts =
    selectedFilter === 'todos'
      ? alerts
      : alerts.filter(
          (alert) => alert.alert_type === selectedFilter,
        )

  useEffect(() => {
    void loadData()

    return () => {
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current)
      }
    }
  }, [])

  return (
    <section className="alerts-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => {
            if (toastTimeout.current) {
              clearTimeout(toastTimeout.current)
              toastTimeout.current = null
            }

            setToast(null)
          }}
        />
      )}

      <div className="page-header">
        <div>
          <h1>Alertas</h1>
          <p>
            Acompanhe os alertas importantes do estoque.
          </p>
        </div>

        <button
          type="button"
          onClick={generateAlerts}
          disabled={loading}
        >
          {loading ? 'Atualizando...' : 'Atualizar alertas'}
        </button>
      </div>

      <div className="dashboard-cards alerts-dashboard-cards">
        <div className="dashboard-card">
          <span className="dashboard-card-label">
            Estoque baixo
          </span>

          <strong className="dashboard-card-value">
            {lowStockAlerts.length}
          </strong>

          <span className="dashboard-card-description">
            alertas de estoque abaixo do mínimo
          </span>
        </div>

        <div className="dashboard-card">
          <span className="dashboard-card-label">
            Próximo do vencimento
          </span>

          <strong className="dashboard-card-value">
            {nearExpirationAlerts.length}
          </strong>

          <span className="dashboard-card-description">
            alertas de lotes próximos da validade
          </span>
        </div>

        <div className="dashboard-card">
          <span className="dashboard-card-label">
            Vencidos
          </span>

          <strong className="dashboard-card-value">
            {expiredAlerts.length}
          </strong>

          <span className="dashboard-card-description">
            alertas de lotes vencidos
          </span>
        </div>
      </div>

      <CollapsibleSection
        title="Alertas ativos"
        description={`${filteredAlerts.length} de ${alerts.length} alertas exibidos.`}
      >
        <div className="alert-filter-cards">
          {filterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`alert-filter-card ${option.className} ${
                selectedFilter === option.id ? 'active' : ''
              }`}
              onClick={() => setSelectedFilter(option.id)}
              aria-pressed={selectedFilter === option.id}
            >
              <span className="alert-filter-card-label">
                {option.label}
              </span>

              <strong>{option.count}</strong>
            </button>
          ))}
        </div>

        {filteredAlerts.length === 0 ? (
          <p className="dashboard-empty">
            {alerts.length === 0
              ? 'Nenhum alerta encontrado.'
              : 'Nenhum alerta encontrado para este filtro.'}
          </p>
        ) : (
          <div className="table-container">
            <table className="products-table alerts-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Produto</th>
                  <th>Lote</th>
                  <th>Tipo</th>
                  <th>Data</th>
                </tr>
              </thead>

              <tbody>
                {filteredAlerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>{alert.id}</td>

                    <td>
                      <strong>
                        {getProductName(alert.product_id)}
                      </strong>
                    </td>

                    <td>{getLotCode(alert.lot_id)}</td>

                    <td>
                      <span
                        className={`alert-badge ${getAlertClass(
                          alert.alert_type,
                        )}`}
                      >
                        {getAlertLabel(alert.alert_type)}
                      </span>
                    </td>

                    <td>
                      {new Date(alert.created_at).toLocaleString(
                        'pt-BR',
                      )}
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

export default Alerts
