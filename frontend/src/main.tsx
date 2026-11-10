import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
// Classes do Tailwind ligadas ao tema (em camadas: o CSS do projeto, sem camada, continua valendo sobre elas).
// Antes do global.css: o tailwind.css declara a ordem das camadas, e o reset do global.css entra na base.
import './styles/tailwind.css'
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
