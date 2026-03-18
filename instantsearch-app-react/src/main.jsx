import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'instantsearch.css/themes/satellite.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
