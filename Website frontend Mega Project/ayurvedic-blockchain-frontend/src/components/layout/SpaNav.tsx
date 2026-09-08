import { Link, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingBag, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { ButtonLink } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-xl px-3 py-1.5 text-sm transition-colors',
    isActive
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      : 'text-foreground/70 hover:bg-white/10 hover:text-foreground'
  )

export function SpaNav() {
  const { isAuthenticated, user } = useAuth()
  const { cartCount } = useCart()
  const homeDash = user?.role === 'farmer' || user?.role === 'admin' ? '/dashboard' : '/consumer'

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-nav sticky top-3 z-40 mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
    >
      <Link to="/" className="font-display flex items-center gap-2 text-xl font-bold tracking-tight">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent dark:from-emerald-300 dark:to-cyan-300">
          AyurAuth
        </span>
      </Link>

      <div className="flex flex-wrap items-center gap-1">
        <NavLink to="/shop" className={linkClass}>
          Shop
        </NavLink>
        <NavLink to="/verify" className={linkClass}>
          Verify
        </NavLink>
        {isAuthenticated ? (
          <NavLink to={homeDash} className={linkClass}>
            Dashboard
          </NavLink>
        ) : null}
        <Link
          to="/shop"
          className="relative ml-1 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/5 hover:bg-white/10"
          aria-label={`Cart (${cartCount})`}
        >
          <ShoppingBag className="h-4 w-4" />
          {cartCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          ) : null}
        </Link>
        {isAuthenticated ? (
          <ButtonLink to={homeDash} variant="neon" size="sm" className="ml-1">
            {user?.name?.split(' ')[0] || 'Account'}
          </ButtonLink>
        ) : (
          <>
            <ButtonLink to="/login" variant="glass" size="sm" className="ml-1">
              Login
            </ButtonLink>
            <ButtonLink to="/signup" variant="neon" size="sm">
              Sign up
            </ButtonLink>
          </>
        )}
      </div>
    </motion.nav>
  )
}
