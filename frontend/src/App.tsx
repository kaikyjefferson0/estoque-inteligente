import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RotaAdmin, RotaProtegida } from './auth/RotaProtegida'
import { AppLayout } from './layout/AppLayout'
import { AjustesPage } from './pages/AjustesPage'
import { AlertasPage } from './pages/AlertasPage'
import { DashboardPage } from './pages/DashboardPage'
import { EntradaPage } from './pages/EntradaPage'
import { EstoquePage } from './pages/EstoquePage'
import { FornecedorEditarPage, FornecedorNovoPage } from './pages/FornecedorFormPage'
import { FornecedoresPage } from './pages/FornecedoresPage'
import { LoginPage } from './pages/LoginPage'
import { MinhaContaPage } from './pages/MinhaContaPage'
import { NaoEncontradaPage } from './pages/NaoEncontradaPage'
import { ProdutoDetalhePage } from './pages/ProdutoDetalhePage'
import { ProdutoEditarPage, ProdutoNovoPage } from './pages/ProdutoFormPage'
import { ProdutosPage } from './pages/ProdutosPage'
import { SaidaPage } from './pages/SaidaPage'
import { UsuarioEditarPage, UsuarioNovoPage } from './pages/UsuarioFormPage'
import { UsuariosPage } from './pages/UsuariosPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RotaProtegida />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              {/* RN-46: admin e operador veem o estoque */}
              <Route path="estoque" element={<EstoquePage />} />
              {/* RN-19: admin e operador cadastram e editam produtos e fornecedores */}
              <Route path="produtos" element={<ProdutosPage />} />
              <Route path="produtos/novo" element={<ProdutoNovoPage />} />
              <Route path="produtos/:id" element={<ProdutoDetalhePage />} />
              <Route path="produtos/:id/editar" element={<ProdutoEditarPage />} />
              <Route path="fornecedores" element={<FornecedoresPage />} />
              <Route path="fornecedores/novo" element={<FornecedorNovoPage />} />
              <Route path="fornecedores/:id/editar" element={<FornecedorEditarPage />} />
              {/* RN-32: admin e operador registram entradas e saídas */}
              <Route path="entrada" element={<EntradaPage />} />
              <Route path="saida" element={<SaidaPage />} />
              {/* RN-43: admin e operador veem os alertas */}
              <Route path="alertas" element={<AlertasPage />} />
              {/* RN-48: cada usuário vê os próprios dados e troca a própria senha */}
              <Route path="minha-conta" element={<MinhaContaPage />} />
              {/* RN-02 e RN-32: só o admin ajusta e cuida dos usuários; o operador é levado ao painel */}
              <Route element={<RotaAdmin />}>
                <Route path="ajustes" element={<AjustesPage />} />
                <Route path="usuarios" element={<UsuariosPage />} />
                <Route path="usuarios/novo" element={<UsuarioNovoPage />} />
                <Route path="usuarios/:id/editar" element={<UsuarioEditarPage />} />
              </Route>
              <Route path="*" element={<NaoEncontradaPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
