import React from 'react'
import { createRoot } from 'react-dom/client'

import 'instantsearch.css/themes/satellite-min.css'
import '@algolia/autocomplete-theme-classic'
import './index.css'

import App from './App'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
