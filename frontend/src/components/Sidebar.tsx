import { NavLink, useNavigate } from 'react-router-dom'

function Sidebar() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <h2>Estoque Inteligente</h2>

      <nav>
        <NavLink to="/">
          <span>Dashboard</span>
          <span className="sidebar-arrow">›</span>
        </NavLink>

        <NavLink to="/products">
          <span>Produtos</span>
          <span className="sidebar-arrow">›</span>
        </NavLink>

        <NavLink to="/suppliers">
          <span>Fornecedores</span>
          <span className="sidebar-arrow">›</span>
        </NavLink>

        <NavLink to="/categories">
          <span>Categorias</span>
          <span className="sidebar-arrow">›</span>
        </NavLink>

        <NavLink to="/lots">
          <span>Lotes</span>
          <span className="sidebar-arrow">›</span>
        </NavLink>

        <NavLink to="/movements">
          <span>Movimentações</span>
          <span className="sidebar-arrow">›</span>
        </NavLink>

        <NavLink to="/alerts">
          <span>Alertas</span>
          <span className="sidebar-arrow">›</span>
        </NavLink>

        <NavLink to="/users">
          <span>Usuários</span>
          <span className="sidebar-arrow">›</span>
        </NavLink>
      </nav>

      <button
        type="button"
        onClick={handleLogout}
      >
        Sair
      </button>
    </aside>
  )
}

export default Sidebar
