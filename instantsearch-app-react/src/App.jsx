import { Routes, Route } from 'react-router-dom'
import { InstantSearch } from 'react-instantsearch'
import client, { indexName } from './algoliaClient'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Results from './components/Results'
import ProductDetail from './components/ProductDetail'
import CartPage from './components/CartPage'

function SearchLayout() {
  return (
    <div className="main-layout">
      <Sidebar />
      <Results />
    </div>
  )
}

export default function App() {
  return (
    <InstantSearch searchClient={client} indexName={indexName} insights>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<SearchLayout />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </div>
    </InstantSearch>
  )
}
