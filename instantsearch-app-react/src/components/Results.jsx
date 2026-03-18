import {
  CurrentRefinements,
  Hits,
  HitsPerPage,
  Pagination,
  SortBy,
  Stats,
} from 'react-instantsearch'
import ProductHit from './ProductHit'
import { indexName } from '../algoliaClient'

export default function Results() {
  return (
    <section className="results">
      <div className="results__toolbar">
        <Stats />
        <div className="results__toolbar-controls">
          <SortBy
            items={[
              { label: 'Relevance', value: indexName },
              { label: 'Price: Low to High', value: `${indexName}_price_asc` },
              { label: 'Price: High to Low', value: `${indexName}_price_desc` },
            ]}
          />
          <HitsPerPage
            items={[
              { label: '12 per page', value: 12, default: true },
              { label: '24 per page', value: 24 },
              { label: '48 per page', value: 48 },
            ]}
          />
        </div>
      </div>

      <div className="results__refinements">
        <CurrentRefinements />
      </div>

      <Hits hitComponent={ProductHit} classNames={{ list: 'product-grid' }} />

      <div className="results__pagination">
        <Pagination />
      </div>
    </section>
  )
}
