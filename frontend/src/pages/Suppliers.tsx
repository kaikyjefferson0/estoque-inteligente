import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import Toast from '../components/Toast'
import CollapsibleSection from '../components/CollapsibleSection'
import API_URL from '../services/api'

type Supplier = {
  id: number
  name: string
  cnpj: string | null
}

function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
  } | null>(null)

  function showToast(
    message: string,
    type: 'success' | 'error' | 'warning' | 'info',
  ) {
    setToast({ message, type })

    setTimeout(() => {
      setToast(null)
    }, 3500)
  }

  async function loadSuppliers() {
    try {
      const response = await fetch(`${API_URL}/suppliers/`)

      if (!response.ok) {
        showToast(
          'Não foi possível carregar os fornecedores.',
          'error',
        )
        return
      }

      const data = await response.json()
      setSuppliers(data)
    } catch (error) {
      console.error(error)
      showToast(
        'Não foi possível carregar os fornecedores.',
        'error',
      )
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [])

  function handleCancel() {
    setName('')
    setCnpj('')
    setShowForm(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) {
      showToast('Informe o nome do fornecedor.', 'warning')
      return
    }

    try {
      const response = await fetch(`${API_URL}/suppliers/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          cnpj: cnpj.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showToast(
          data.detail ?? 'Não foi possível cadastrar o fornecedor.',
          'error',
        )
        return
      }

      showToast('Fornecedor cadastrado com sucesso!', 'success')

      handleCancel()
      await loadSuppliers()
    } catch (error) {
      console.error(error)
      showToast(
        'Não foi possível cadastrar o fornecedor.',
        'error',
      )
    }
  }

  return (
    <section className="suppliers-page">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1>Fornecedores</h1>
          <p>
            Gerencie os fornecedores cadastrados no sistema.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm(true)}
        >
          Novo fornecedor
        </button>
      </div>

      {showForm && (
        <div className="products-card">
          <div className="table-header">
            <div>
              <h2>Cadastrar fornecedor</h2>
              <p>Informe os dados do fornecedor.</p>
            </div>

            <button type="button" onClick={handleCancel}>
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="supplierName">
                Nome do fornecedor
              </label>

              <input
                id="supplierName"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Distribuidora Central"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="supplierCnpj">CNPJ</label>

              <input
                id="supplierCnpj"
                type="text"
                value={cnpj}
                onChange={(event) => setCnpj(event.target.value)}
                placeholder="Opcional"
              />
            </div>

            <button type="submit">
              Cadastrar fornecedor
            </button>
          </form>
        </div>
      )}

      <CollapsibleSection
        title="Fornecedores cadastrados"
        description={`${suppliers.length} fornecedores encontrados.`}
      >
        {suppliers.length === 0 ? (
          <p>Nenhum fornecedor cadastrado.</p>
        ) : (
          <div className="table-container">
            <table className="products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fornecedor</th>
                  <th>CNPJ</th>
                </tr>
              </thead>

              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>{supplier.id}</td>
                    <td>
                      <strong>{supplier.name}</strong>
                    </td>
                    <td>{supplier.cnpj ?? 'Não informado'}</td>
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

export default Suppliers
