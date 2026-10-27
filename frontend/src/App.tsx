import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RotaAdmin, RotaProtegida } from './auth/RotaProtegida'
import { EmConstrucao } from './components/EmConstrucao'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { FornecedorEditarPage, FornecedorNovoPage } from './pages/FornecedorFormPage'
import { FornecedoresPage } from './pages/FornecedoresPage'
import { LoginPage } from './pages/LoginPage'
import { NaoEncontradaPage } from './pages/NaoEncontradaPage'
import { ProdutoDetalhePage } from './pages/ProdutoDetalhePage'
import { ProdutoEditarPage, ProdutoNovoPage } from './pages/ProdutoFormPage'
import { ProdutosPage } from './pages/ProdutosPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RotaProtegida />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="estoque" element={<EmConstrucao titulo="Estoque" />} />
              {/* RN-19: admin e operador cadastram e editam produtos e fornecedores */}
              <Route path="produtos" element={<ProdutosPage />} />
              <Route path="produtos/novo" element={<ProdutoNovoPage />} />
              <Route path="produtos/:id" element={<ProdutoDetalhePage />} />
              <Route path="produtos/:id/editar" element={<ProdutoEditarPage />} />
              <Route path="fornecedores" element={<FornecedoresPage />} />
              <Route path="fornecedores/novo" element={<FornecedorNovoPage />} />
              <Route path="fornecedores/:id/editar" element={<FornecedorEditarPage />} />
              <Route path="entrada" element={<EmConstrucao titulo="Entrada" />} />
              <Route path="saida" element={<EmConstrucao titulo="Saída" />} />
              <Route path="alertas" element={<EmConstrucao titulo="Alertas" />} />
              <Route element={<RotaAdmin />}>
                <Route path="ajustes" element={<EmConstrucao titulo="Ajustes" />} />
                <Route path="usuarios" element={<EmConstrucao titulo="Usuários" />} />
              </Route>
              <Route path="*" element={<NaoEncontradaPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
