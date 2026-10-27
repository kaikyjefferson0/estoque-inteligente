import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RotaAdmin, RotaProtegida } from './auth/RotaProtegida'
import { EmConstrucao } from './components/EmConstrucao'
import { AppLayout } from './layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NaoEncontradaPage } from './pages/NaoEncontradaPage'

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
              <Route path="produtos" element={<EmConstrucao titulo="Produtos" />} />
              <Route path="fornecedores" element={<EmConstrucao titulo="Fornecedores" />} />
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
