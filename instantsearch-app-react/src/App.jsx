import { InstantSearch } from 'react-instantsearch'
import client, { indexName } from './algoliaClient'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Results from './components/Results'

export default function App() {
  return (
    <InstantSearch searchClient={client} indexName={indexName} insights>
      <div className="app">
        <Header />
        <div className="main-layout">
          <Sidebar />
          <Results />
        </div>
      </div>
    </InstantSearch>
  )
}
