import {
  InstantSearch,
  Configure,
  Hits,
  Stats,
  Pagination,
  CurrentRefinements,
} from 'react-instantsearch'

import { searchClient, indexName, aa, userToken } from './searchClient'
import { Autocomplete } from './components/Autocomplete'
import { Sidebar } from './components/Sidebar'
import { ProductHit } from './components/ProductHit'

export default function App() {
  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={indexName}
      // Reuse our initialized search-insights client so events carry the same userToken.
      insights={{ insightsClient: aa }}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      {/* Results per page for the main product grid, plus the userToken sent with each search. */}
      <Configure hitsPerPage={12} userToken={userToken} />

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
