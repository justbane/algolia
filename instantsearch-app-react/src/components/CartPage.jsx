import { Link } from 'react-router-dom'
import { useCart } from '../CartContext'

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart()

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <p className="cart-empty__message">Your cart is empty.</p>
        <Link to="/" className="detail__back">← Continue Shopping</Link>
      </div>
    )
  }

  return (
    <div className="cart">
      <div className="cart__header">
        <h1 className="cart__title">Your Cart</h1>
        <Link to="/" className="detail__back">← Continue Shopping</Link>
      </div>

      <ul className="cart__list">
        {cart.map(({ hit, quantity }) => (
          <li key={hit.objectID} className="cart-item">
            <div className="cart-item__image-wrapper">
              {hit.image ? (
                <img
                  src={hit.image}
                  alt={hit.name}
                  className="cart-item__image"
                />
              ) : (
                <div className="product-hit__image-placeholder">No image</div>
              )}
            </div>

            <div className="cart-item__info">
              <Link to={`/product/${hit.objectID}`} className="cart-item__name">
                {hit.name}
              </Link>
              <p className="product-hit__brand">{hit.brand}</p>
              <p className="cart-item__price">${Number(hit.price).toFixed(2)}</p>
            </div>

            <div className="cart-item__controls">
              <button
                className="cart-item__qty-btn"
                onClick={() => updateQuantity(hit.objectID, quantity - 1)}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="cart-item__qty">{quantity}</span>
              <button
                className="cart-item__qty-btn"
                onClick={() => updateQuantity(hit.objectID, quantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <p className="cart-item__subtotal">
              ${(hit.price * quantity).toFixed(2)}
            </p>

            <button
              className="cart-item__remove"
              onClick={() => removeFromCart(hit.objectID)}
              aria-label="Remove item"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="cart__footer">
        <p className="cart__total">
          Total: <strong>${cartTotal.toFixed(2)}</strong>
        </p>
        <button className="btn-cart btn-cart--lg">Checkout</button>
      </div>
    </div>
  )
}
