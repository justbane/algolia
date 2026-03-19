import { createContext, useContext, useState, useMemo } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])

  function addToCart(hit) {
    setCart((prev) => {
      const existing = prev.find((item) => item.hit.objectID === hit.objectID)
      if (existing) {
        return prev.map((item) =>
          item.hit.objectID === hit.objectID
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { hit, quantity: 1 }]
    })
  }

  function removeFromCart(objectID) {
    setCart((prev) => prev.filter((item) => item.hit.objectID !== objectID))
  }

  function updateQuantity(objectID, quantity) {
    if (quantity < 1) {
      removeFromCart(objectID)
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        item.hit.objectID === objectID ? { ...item, quantity } : item
      )
    )
  }

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  )

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.hit.price * item.quantity, 0),
    [cart]
  )

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, cartCount, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
