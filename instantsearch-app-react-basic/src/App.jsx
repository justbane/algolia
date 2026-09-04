import {
  InstantSearch,
  Configure,
  Hits,
  Stats,
  Pagination,
  CurrentRefinements,
} from 'react-instantsearch'

import { searchClient, indexName } from './searchClient'
import { Autocomplete } from './components/Autocomplete'
import { Sidebar } from './components/Sidebar'
import { ProductHit } from './components/ProductHit'

export default function App() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      {/* Controls the number of results per page for the main product grid. */}
      <Configure hitsPerPage={12} />

      <header className="header">
        <h1 className="header__title">Algolia &middot; React InstantSearch</h1>
        {/* Autocomplete dropdown: query suggestions + a few product hits. */}
        <Autocomplete />
      </header>

      <div className="layout">
        {/* Faceted navigation. */}
        <Sidebar />

        <main className="results">
          <div className="results__toolbar">
            <Stats />
            <CurrentRefinements />
          </div>

          <Hits hitComponent={ProductHit} />

          <Pagination className="results__pagination" padding={2} />
        </main>
      </div>
    </InstantSearch>
  )
}
