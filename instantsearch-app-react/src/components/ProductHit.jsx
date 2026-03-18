import { Highlight } from 'react-instantsearch'

function StarRating({ rating, maxRating = 5 }) {
  return (
    <div className="product-hit__rating" aria-label={`Rating: ${rating} out of ${maxRating}`}>
      {Array.from({ length: maxRating }, (_, i) => (
        <span key={i} className={i < Math.round(rating) ? 'star star--filled' : 'star'}>
          ★
        </span>
      ))}
    </div>
  )
}

export default function ProductHit({ hit }) {
  return (
    <article className="product-hit">
      <div className="product-hit__image-wrapper">
        {hit.image ? (
          <img
            src={hit.image}
            alt={hit.name}
            className="product-hit__image"
            loading="lazy"
          />
        ) : (
          <div className="product-hit__image-placeholder">No image</div>
        )}
      </div>

      <div className="product-hit__body">
        <p className="product-hit__brand">{hit.brand}</p>
        <h2 className="product-hit__name">
          <Highlight attribute="name" hit={hit} />
        </h2>

        {hit.rating != null && (
          <StarRating rating={hit.rating} />
        )}

        <div className="product-hit__footer">
          <span className="product-hit__price">
            ${Number(hit.price).toFixed(2)}
          </span>
          {hit.free_shipping && (
            <span className="product-hit__badge">Free Shipping</span>
          )}
        </div>
      </div>
    </article>
  )
}
