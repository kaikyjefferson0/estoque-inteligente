import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import './styles/global.css'
import './styles/componentes.css'
import './styles/layout.css'
// Depois dos estilos compartilhados, para o CSS de cada página poder sobrescrevê-los
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
