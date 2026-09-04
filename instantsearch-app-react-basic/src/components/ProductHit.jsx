import { Highlight } from 'react-instantsearch'

// One card in the main product grid.
export function ProductHit({ hit }) {
  return (
    <article className="product">
      <img className="product__image" src={hit.image} alt={hit.name} loading="lazy" />
      <div className="product__brand">{hit.brand}</div>
      <h2 className="product__name">
        <Highlight attribute="name" hit={hit} />
      </h2>
      <div className="product__price">${hit.price}</div>
    </article>
  )
}
