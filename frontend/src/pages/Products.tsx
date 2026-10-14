import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import Toast from '../components/Toast'
import CollapsibleSection from '../components/CollapsibleSection'
import API_URL from '../services/api'

type Product = {
  id: number
  name: string
  barcode: string
  category_id: number | null
  supplier_id: number | null
  minimum_stock: number
  controls_expiration: boolean
  active: boolean
}

type Category = {
  id: number
  name: string
}

type Supplier = {
  id: number
  name: string
}

function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '',
    barcode: '',
    category_id: '',
    supplier_id: '',
    minimum_stock: '0',
    controls_expiration: true,
  })

  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  } | null>(null)

  async function loadProducts() {
    const token = localStorage.getItem('access_token')

    if (!token) {
      setToast({
        message: 'Faça login para continuar.',
        type: 'error',
      })
      return
    }

    try {
      const response = await fetch(`${API_URL}/products/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(
          'Não foi possível carregar os produtos.',
        )
      }

      const data = await response.json()
      setProducts(data)
    } catch (error) {
      console.error(error)
      setToast({
        message: 'Não foi possível carregar os produtos.',
        type: 'error',
      })
    }
  }

  async function loadFormData() {
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      }

      const [categoriesResponse, suppliersResponse] =
        await Promise.all([
          fetch(`${API_URL}/categories/`, { headers }),
          fetch(`${API_URL}/suppliers/`, { headers }),
        ])

      if (!categoriesResponse.ok || !suppliersResponse.ok) {
        throw new Error('Não foi possível carregar os dados.')
      }

      setCategories(await categoriesResponse.json())
      setSuppliers(await suppliersResponse.json())
    } catch (error) {
      console.error(error)
      setToast({
        message:
          'Não foi possível carregar categorias e fornecedores.',
        type: 'error',
      })
    }
  }

  useEffect(() => {
    loadProducts()
    loadFormData()
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

    if (!form.name.trim()) {
      setToast({
        message: 'Informe o nome do produto.',
        type: 'warning',
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

    if (!form.minimum_stock.trim()) {
      setToast({
        message: 'Informe o estoque mínimo.',
        type: 'warning',
      })
      return
    }

    const minimumStock = Number(form.minimum_stock)

    if (
      !Number.isFinite(minimumStock) ||
      minimumStock < 0
    ) {
      setToast({
        message:
          'O estoque mínimo deve ser igual ou maior que zero.',
        type: 'warning',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/products/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          barcode: form.barcode.trim(),
          category_id: form.category_id
            ? Number(form.category_id)
            : null,
          supplier_id: form.supplier_id
            ? Number(form.supplier_id)
            : null,
          minimum_stock: minimumStock,
          controls_expiration: form.controls_expiration,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ??
            'Não foi possível cadastrar o produto.',
        )
      }

      setToast({
        message: 'Produto cadastrado com sucesso!',
        type: 'success',
      })

      setForm({
        name: '',
        barcode: '',
        category_id: '',
        supplier_id: '',
        minimum_stock: '0',
        controls_expiration: true,
      })

      await loadProducts()
    } catch (error) {
      console.error(error)
      setToast({
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível cadastrar o produto.',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const searchTerm = search.toLowerCase().trim()

    if (!searchTerm) return true

    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.barcode.toLowerCase().includes(searchTerm)
    )
  })

  function getCategoryName(categoryId: number | null) {
    if (categoryId === null) return '-'

    return (
      categories.find((category) => category.id === categoryId)
        ?.name ?? '-'
    )
  }

  function getSupplierName(supplierId: number | null) {
    if (supplierId === null) return '-'

    return (
      suppliers.find((supplier) => supplier.id === supplierId)
        ?.name ?? '-'
    )
  }

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
          <h1>Produtos</h1>
          <p>Cadastre e consulte os produtos do estoque.</p>
        </div>
      </div>

      <section className="products-card">
        <h2>Cadastrar produto</h2>
        <p>Informe os dados do novo produto.</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nome</label>
            <input
              id="name"
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
            <label htmlFor="barcode">Código de barras</label>
            <input
              id="barcode"
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
            <label htmlFor="category">Categoria</label>
            <select
              id="category"
              value={form.category_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  category_id: event.target.value,
                })
              }
            >
              <option value="">Sem categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="supplier">Fornecedor</label>
            <select
              id="supplier"
              value={form.supplier_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  supplier_id: event.target.value,
                })
              }
            >
              <option value="">Sem fornecedor</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="minimum-stock">Estoque mínimo</label>
            <input
              id="minimum-stock"
              type="number"
              min="0"
              step="1"
              value={form.minimum_stock}
              onChange={(event) =>
                setForm({
                  ...form,
                  minimum_stock: event.target.value,
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={form.controls_expiration}
                onChange={(event) =>
                  setForm({
                    ...form,
                    controls_expiration: event.target.checked,
                  })
                }
              />{' '}
              Controla validade
            </label>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Cadastrando...' : 'Cadastrar produto'}
          </button>
        </form>
      </section>

      <CollapsibleSection
        title="Produtos cadastrados"
        description={`${filteredProducts.length} produto(s) encontrado(s).`}
      >
        <div className="product-search">
          <label htmlFor="product-search">Buscar produto</label>
          <input
            id="product-search"
            type="text"
            placeholder="Nome ou código de barras..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {filteredProducts.length === 0 ? (
          <p className="dashboard-empty">
            Nenhum produto encontrado.
          </p>
        ) : (
          <div className="table-container">
            <table className="products-table products-table-compact">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Código</th>
                  <th>Categoria</th>
                  <th>Fornecedor</th>
                  <th>Estoque</th>
                  <th>Validade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="product-main-cell">
                      <strong>{product.name}</strong>
                    </td>
                    <td className="product-barcode-cell">
                      {product.barcode}
                    </td>
                    <td>
                      <span className="product-info-text">
                        {getCategoryName(product.category_id)}
                      </span>
                    </td>
                    <td>
                      <span className="product-info-text">
                        {getSupplierName(product.supplier_id)}
                      </span>
                    </td>
                    <td>
                      <span className="product-stock-badge">
                        {product.minimum_stock}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          product.controls_expiration
                            ? 'product-expiration-badge product-expiration-yes'
                            : 'product-expiration-badge product-expiration-no'
                        }
                      >
                        {product.controls_expiration
                          ? 'Controlada'
                          : 'Não'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          product.active
                            ? 'status-active'
                            : 'status-inactive'
                        }
                      >
                        {product.active ? 'Ativo' : 'Inativo'}
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

export default Products
