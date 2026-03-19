import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import client, { indexName } from '../algoliaClient'
import { useCart } from '../CartContext'

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

export default function ProductDetail() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const [{ product, error, loadedId }, setFetchState] = useState({
    product: null,
    error: null,
    loadedId: null,
  })
  const [added, setAdded] = useState(false)
  const loading = loadedId !== id

  useEffect(() => {
    let cancelled = false
    client
      .getObject({ indexName, objectID: id })
      .then((obj) => {
        if (!cancelled) setFetchState({ product: obj, error: null, loadedId: id })
      })
      .catch(() => {
        if (!cancelled) setFetchState({ product: null, error: 'Product not found.', loadedId: id })
      })
    return () => { cancelled = true }
  }, [id])

  function handleAddToCart() {
    addToCart(product)
    if (typeof window.aa === 'function') {
      window.aa('convertedObjectIDs', {
        eventName: 'Added to Cart',
        index: indexName,
        objectIDs: [product.objectID],
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (loading) {
    return (
      <div className="detail-state">
        <p>Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="detail-state">
        <p>{error}</p>
        <Link to="/" className="detail__back">← Back to results</Link>
      </div>
    )
  }

  return (
    <div className="detail">
      <Link to="/" className="detail__back">← Back to results</Link>

      <div className="detail__layout">
        <div className="detail__image-wrapper">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="detail__image"
            />
          ) : (
            <div className="product-hit__image-placeholder">No image</div>
          )}
        </div>

        <div className="detail__info">
          <p className="product-hit__brand">{product.brand}</p>
          <h1 className="detail__name">{product.name}</h1>

          {product.rating != null && <StarRating rating={product.rating} />}

          <p className="detail__price">${Number(product.price).toFixed(2)}</p>

          {product.free_shipping && (
            <span className="product-hit__badge">Free Shipping</span>
          )}

          {product.description && (
            <p className="detail__description">{product.description}</p>
          )}

          <button
            className={`btn-cart btn-cart--lg ${added ? 'btn-cart--added' : ''}`}
            onClick={handleAddToCart}
          >
            {added ? 'Added!' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
