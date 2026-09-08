import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { HerbRecord } from '@/types/herb'
import { useAuth } from '@/context/AuthContext'

export interface CartItem {
  batchId: string
  herbName: string
  priceInr: number
  imageUrl?: string
  isVerified?: boolean
}

interface WishlistItem {
  batchId: string
  herbName: string
  priceInr: number
  imageUrl?: string
  savedAt: string
}

interface CartContextValue {
  cart: CartItem[]
  wishlist: WishlistItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (batchId: string) => void
  clearCart: () => void
  toggleWishlist: (item: Omit<WishlistItem, 'savedAt'>) => void
  isWishlisted: (batchId: string) => boolean
  cartTotal: number
  cartCount: number
}

const CartContext = createContext<CartContextValue | null>(null)

function storageKey(base: string, email?: string) {
  return `${base}-${email || 'guest'}`
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [cart, setCart] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])

  useEffect(() => {
    try {
      const c = localStorage.getItem(storageKey('ayurauth-cart', user?.email))
      const w = localStorage.getItem(storageKey('ayurauth-wishlist', user?.email))
      setCart(c ? JSON.parse(c) : [])
      setWishlist(w ? JSON.parse(w) : [])
    } catch {
      setCart([])
      setWishlist([])
    }
  }, [user?.email])

  useEffect(() => {
    localStorage.setItem(storageKey('ayurauth-cart', user?.email), JSON.stringify(cart))
  }, [cart, user?.email])

  useEffect(() => {
    localStorage.setItem(storageKey('ayurauth-wishlist', user?.email), JSON.stringify(wishlist))
  }, [wishlist, user?.email])

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      if (prev.some((p) => p.batchId === item.batchId)) return prev
      return [...prev, item]
    })
  }, [])

  const removeFromCart = useCallback((batchId: string) => {
    setCart((prev) => prev.filter((p) => p.batchId !== batchId))
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const toggleWishlist = useCallback((item: Omit<WishlistItem, 'savedAt'>) => {
    setWishlist((prev) => {
      if (prev.some((p) => p.batchId === item.batchId)) {
        return prev.filter((p) => p.batchId !== item.batchId)
      }
      return [...prev, { ...item, savedAt: new Date().toISOString() }]
    })
  }, [])

  const isWishlisted = useCallback(
    (batchId: string) => wishlist.some((w) => w.batchId === batchId),
    [wishlist]
  )

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + (i.priceInr || 0), 0), [cart])
  const cartCount = cart.length

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      addToCart,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWishlisted,
      cartTotal,
      cartCount,
    }),
    [
      cart,
      wishlist,
      addToCart,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isWishlisted,
      cartTotal,
      cartCount,
    ]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function herbToCartItem(record: HerbRecord, priceInr: number): CartItem {
  return {
    batchId: record.id,
    herbName: record.herbName,
    priceInr,
    imageUrl: record.imageUrl,
    isVerified: record.isVerified,
  }
}
