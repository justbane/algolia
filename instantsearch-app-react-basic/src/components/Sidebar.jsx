import {
  ClearRefinements,
  RefinementList,
  RangeInput,
  ToggleRefinement,
} from 'react-instantsearch'

// Facets shown in the left sidebar. Each `attribute` must be declared as an
// "attribute for faceting" in the Algolia dashboard (Configuration > Facets).
export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__section">
        <ClearRefinements translations={{ resetButtonText: 'Clear all filters' }} />
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__heading">Category</h3>
        <RefinementList attribute="categories" searchable showMore limit={6} />
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__heading">Brand</h3>
        <RefinementList attribute="brand" searchable showMore limit={6} />
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__heading">Price</h3>
        <RangeInput attribute="price" />
      </div>

      <div className="sidebar__section">
        <ToggleRefinement attribute="free_shipping" label="Free shipping only" />
      </div>
    </aside>
  )
}
