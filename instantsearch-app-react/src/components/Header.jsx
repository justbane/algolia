import { Link } from 'react-router-dom'
import SearchWithSuggestions from './SearchWithSuggestions'
import { useCart } from '../CartContext'

export default function Header() {
  const { cartCount } = useCart()

  return (
    <header className="header">
      <Link to="/" className="header__logo">
        <span className="header__logo-icon">⚡</span>
        <span className="header__logo-text">ElectroSearch</span>
      </Link>
      <div className="header__search">
        <SearchWithSuggestions />
      </div>
      <Link to="/cart" className="header__cart" aria-label={`Cart, ${cartCount} items`}>
        🛒
        {cartCount > 0 && (
          <span className="header__cart-badge">{cartCount}</span>
        )}
      </Link>
    </header>
  )
}
