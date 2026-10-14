import { useEffect, useState } from 'react'

import API_URL from '../services/api'

type Product = {
  id: number
  name: string
  minimum_stock: number
}

type Lot = {
  id: number
  quantity: number
}

type Alert = {
  id: number
  active: boolean
}

type DashboardData = {
  products: Product[] | null
  lots: Lot[] | null
  suppliers: unknown[] | null
  movements: unknown[] | null
  alerts: Alert[] | null
}

function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    products: null,
    lots: null,
    suppliers: null,
    movements: null,
    alerts: null,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchCollection<T>(
    path: string,
    headers: HeadersInit,
  ): Promise<T[] | null> {
    try {
      const response = await fetch(`${API_URL}${path}`, {
        headers,
      })

      if (!response.ok) {
        return null
      }

      const result: unknown = await response.json()

      return Array.isArray(result) ? (result as T[]) : null
    } catch (error) {
      console.error(`Erro ao consultar ${path}:`, error)
      return null
    }
  }

  async function loadDashboard() {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setError('Faça login para consultar o dashboard.')
      return
    }

    setLoading(true)
    setError('')

    const headers = {
      Authorization: `Bearer ${token}`,
    }

    try {
      const [
        products,
        lots,
        suppliers,
        movements,
        alerts,
      ] = await Promise.all([
        fetchCollection<Product>('/products/', headers),
        fetchCollection<Lot>('/lots/', headers),
        fetchCollection<unknown>('/suppliers/', headers),
        fetchCollection<unknown>('/movements/', headers),
        fetchCollection<Alert>('/alerts/', headers),
      ])

      setData({
        products,
        lots,
        suppliers,
        movements,
        alerts,
      })

      if (products === null || lots === null) {
        setError(
          'Não foi possível carregar os produtos ou lotes. Verifique a conexão com o servidor.',
        )
      }
    } catch (error) {
      console.error(error)
      setError('Ocorreu um erro ao carregar o dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  const totalProducts = data.products?.length
  const totalLots = data.lots?.length

  const totalStock = data.lots?.reduce(
    (total, lot) => total + lot.quantity,
    0,
  )

  const totalSuppliers = data.suppliers?.length
  const totalMovements = data.movements?.length

  const totalAlerts = data.alerts?.filter(
    (alert) => alert.active,
  ).length

  const cards = [
    {
      title: 'Produtos',
      value: totalProducts,
      description: 'Produtos cadastrados',
      icon: '📦',
    },
    {
      title: 'Lotes',
      value: totalLots,
      description: 'Lotes registrados',
      icon: '🗃️',
    },
    {
      title: 'Estoque',
      value: totalStock,
      description: 'Unidades disponíveis',
      icon: '🏭',
    },
    {
      title: 'Fornecedores',
      value: totalSuppliers,
      description: 'Fornecedores cadastrados',
      icon: '🚚',
    },
    {
      title: 'Movimentações',
      value: totalMovements,
      description: 'Registros de movimentação',
      icon: '🔄',
    },
    {
      title: 'Alertas ativos',
      value: totalAlerts,
      description: 'Alertas que precisam de atenção',
      icon: '🔔',
    },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Visão geral do estoque e da operação.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          {loading ? 'Atualizando...' : 'Atualizar dados'}
        </button>
      </div>

      {error && (
        <p className="dashboard-empty" role="alert">
          {error}
        </p>
      )}

      <section className="dashboard-cards">
        {cards.map((card) => (
          <div
            className="dashboard-card"
            key={card.title}
          >
            <span className="dashboard-card-label">
              {card.icon} {card.title}
            </span>

            <strong className="dashboard-card-value">
              {card.value ?? '—'}
            </strong>

            <span className="dashboard-card-description">
              {card.description}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}

export default Dashboard
