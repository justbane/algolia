import {
  ClearRefinements,
  RefinementList,
  RangeInput,
  ToggleRefinement,
} from 'react-instantsearch'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__section">
        <ClearRefinements
          translations={{ resetButtonText: 'Clear all filters' }}
        />
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__heading">Brand</h3>
        <RefinementList attribute="brand" searchable showMore />
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__heading">Category</h3>
        <RefinementList attribute="categories" searchable showMore />
      </div>

      <div className="sidebar__section">
        <h3 className="sidebar__heading">Price Range</h3>
        <RangeInput classNames={{ input: 'ranger' }} attribute="price" min={0} max={1000} />
      </div>

      <div className="sidebar__section">
        <ToggleRefinement attribute="free_shipping" label="Free Shipping" />
      </div>
    </aside>
  )
}
