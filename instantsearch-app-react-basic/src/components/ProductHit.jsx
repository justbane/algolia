import { useState } from 'react'
import { Highlight } from 'react-instantsearch'

// One card in the main product grid.
//
// `sendEvent` is injected automatically by <Hits hitComponent={ProductHit} />
// when the parent <InstantSearch> has `insights` enabled. "View" events for
// rendered hits are sent automatically by that same middleware; click and
// add-to-cart are sent manually here since they depend on user interaction.
export function ProductHit({ hit, sendEvent }) {
  const [added, setAdded] = useState(false)

  function handleAddToCart(e) {
    e.preventDefault()
    sendEvent('conversion', hit, 'Added to Cart', { eventSubtype: 'addToCart' })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <article
      className="product"
      onClick={() => sendEvent('click', hit, 'Product Clicked')}
    >
      <img className="product__image" src={hit.image} alt={hit.name} loading="lazy" />
      <div className="product__brand">{hit.brand}</div>
      <h2 className="product__name">
        <Highlight attribute="name" hit={hit} />
      </h2>
      <div className="product__price">${hit.price}</div>
      <button
        type="button"
        className={`product__cart-btn ${added ? 'product__cart-btn--added' : ''}`}
        onClick={handleAddToCart}
      >
        {added ? 'Added!' : 'Add to Cart'}
      </button>
    </article>
  )
}
