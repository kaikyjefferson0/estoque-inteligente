import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Movements from './pages/Movements'
import Lots from './pages/Lots'
import Alerts from './pages/Alerts'
import Suppliers from './pages/Suppliers'
import Categories from './pages/Categories'
import Users from './pages/Users'
import Login from './pages/Login'
import './App.css'

function getUserRole() {
  const token = localStorage.getItem('access_token')

  if (!token) {
    return null
  }

  try {
    const payload = JSON.parse(
      atob(token.split('.')[1]),
    )

    return payload.role ?? null
  } catch {
    return null
  }
}

function ProtectedRoutes() {
  const token = localStorage.getItem('access_token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="app">
      <Sidebar />

      <section className="content">
        <Routes>
          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/products"
            element={<Products />}
          />

          <Route
            path="/movements"
            element={<Movements />}
          />

          <Route
            path="/lots"
            element={<Lots />}
          />

          <Route
            path="/alerts"
            element={<Alerts />}
          />

          <Route
            path="/suppliers"
            element={<Suppliers />}
          />

          <Route
            path="/categories"
            element={<Categories />}
          />

          <Route
            path="/users"
            element={
              getUserRole() === 'admin' ? (
                <Users />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </section>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="*"
          element={<ProtectedRoutes />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
