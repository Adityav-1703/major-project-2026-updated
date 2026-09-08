import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Award,
  Camera,
  CheckCircle2,
  ChevronRight,
  FlaskConical,
  Heart,
  History,
  Loader2,
  LogOut,
  MapPin,
  Package,
  QrCode,
  ScanLine,
  ShoppingBag,
  Sprout,
  Star,
  Truck,
  User,
  XCircle,
} from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { QRScanner } from '@/components/QRScanner'
import { VerifyStatusBanner } from '@/components/VerifyStatusBanner'
import { SpaNav } from '@/components/layout/SpaNav'
import { useVerify } from '@/hooks/useVerify'
import { fetchHerbQrImage, fetchMyOrders, type OrderRecord } from '@/lib/api'
import { formatInr } from '@/lib/price'
import type { HerbRecord } from '@/types/herb'
import { cn } from '@/lib/utils'

type Tab = 'overview' | 'orders' | 'verify' | 'wishlist' | 'rewards' | 'profile'

const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
  { id: 'overview', label: 'Overview', icon: Sprout },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'verify', label: 'Verify', icon: ScanLine },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'rewards', label: 'Rewards', icon: Award },
  { id: 'profile', label: 'Profile', icon: User },
]

export default function ConsumerDashboard() {
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()
  const { wishlist, cart, cartTotal, cartCount, toggleWishlist, addToCart } = useCart()
  const { record: result, verifyStatus, message, isLoading, verify, reset } = useVerify()
  const [tab, setTab] = useState<Tab>('overview')
  const [query, setQuery] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanHistory, setScanHistory] = useState<Array<{ record: HerbRecord; scannedAt: string }>>(
    []
  )
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [orderQr, setOrderQr] = useState<Record<string, string>>({})
  const [notifyEmail, setNotifyEmail] = useState(true)
  const [notifyScan, setNotifyScan] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  useEffect(() => {
    const saved = localStorage.getItem(`ayurauth-scan-history-${user?.email}`)
    if (saved) {
      try {
        setScanHistory(JSON.parse(saved))
      } catch {
        /* ignore */
      }
    }
    const prefs = localStorage.getItem(`ayurauth-prefs-${user?.email}`)
    if (prefs) {
      try {
        const p = JSON.parse(prefs)
        setNotifyEmail(Boolean(p.notifyEmail))
        setNotifyScan(Boolean(p.notifyScan))
      } catch {
        /* ignore */
      }
    }
  }, [user?.email])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchMyOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
  }, [isAuthenticated])

  const loyaltyPoints = useMemo(
    () => orders.reduce((s, o) => s + Math.round((o.amount || 0) / 10), 0) + scanHistory.length * 5,
    [orders, scanHistory]
  )

  const spendSeries = useMemo(() => {
    const byDay: Record<string, number> = {}
    orders.forEach((o) => {
      const d = new Date(o.paidAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      byDay[d] = (byDay[d] || 0) + (o.amount || 0)
    })
    return Object.entries(byDay)
      .slice(-8)
      .map(([day, amount]) => ({ day, amount }))
  }, [orders])

  const saveHistory = (record: HerbRecord) => {
    const newHistory = [{ record, scannedAt: new Date().toISOString() }, ...scanHistory.slice(0, 19)]
    setScanHistory(newHistory)
    localStorage.setItem(`ayurauth-scan-history-${user?.email}`, JSON.stringify(newHistory))
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const verification = await verify(query)
    if (verification?.record) saveHistory(verification.record)
  }

  const handleQRScan = async (data: string | null) => {
    if (!data) return
    setQuery(data)
    setShowScanner(false)
    const verification = await verify(data)
    if (verification?.record) saveHistory(verification.record)
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen spa-surface text-foreground">
      <div className="noise-overlay fixed inset-0 z-[1] opacity-[0.035]" aria-hidden />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6">
        <SpaNav />

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl font-bold sm:text-4xl"
            >
              Welcome back, {user?.name?.split(' ')[0]}
            </motion.h1>
            <p className="mt-2 max-w-xl text-sm text-foreground/70">
              Track orders, verify packs, earn authenticity rewards, and manage your AyurAuth
              consumer vault.
            </p>
          </div>
          <div className="flex gap-2">
            <ButtonLink to="/shop" variant="neon" size="sm" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              Shop
            </ButtonLink>
            <Button
              variant="glass"
              size="sm"
              className="gap-2"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="glass-panel mt-8 flex gap-1 overflow-x-auto rounded-2xl p-1.5">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all',
                  tab === t.id
                    ? 'bg-emerald-500/20 text-emerald-800 shadow-sm dark:text-emerald-200'
                    : 'text-foreground/60 hover:bg-white/10 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="mt-6"
          >
            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: 'Orders',
                      value: orders.length,
                      icon: Package,
                      tone: 'from-emerald-500/20 to-teal-500/10',
                    },
                    {
                      label: 'Scans',
                      value: scanHistory.length,
                      icon: History,
                      tone: 'from-cyan-500/20 to-sky-500/10',
                    },
                    {
                      label: 'Wishlist',
                      value: wishlist.length,
                      icon: Heart,
                      tone: 'from-rose-500/20 to-orange-500/10',
                    },
                    {
                      label: 'Reward pts',
                      value: loyaltyPoints,
                      icon: Award,
                      tone: 'from-amber-500/20 to-yellow-500/10',
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={cn(
                        'glass-panel relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br',
                        s.tone
                      )}
                    >
                      <s.icon className="mb-3 h-5 w-5 text-foreground/70" />
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-foreground/60">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 lg:grid-cols-5">
                  <Card className="glass-panel lg:col-span-3">
                    <CardHeader>
                      <CardTitle className="text-lg">Spend pulse</CardTitle>
                      <CardDescription>Recent verified purchases</CardDescription>
                    </CardHeader>
                    <CardContent className="h-56">
                      {spendSeries.length ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={spendSeries}>
                            <defs>
                              <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area
                              type="monotone"
                              dataKey="amount"
                              stroke="#059669"
                              fill="url(#spend)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          Buy a batch to see your spend chart.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="glass-panel lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Cart snapshot</CardTitle>
                      <CardDescription>
                        {cartCount} item{cartCount === 1 ? '' : 's'} · {formatInr(cartTotal)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {cart.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Cart is empty.</p>
                      ) : (
                        cart.slice(0, 3).map((c) => (
                          <div
                            key={c.batchId}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span className="truncate font-medium">{c.herbName}</span>
                            <span>{formatInr(c.priceInr)}</span>
                          </div>
                        ))
                      )}
                      <ButtonLink to="/shop" variant="neon" className="w-full justify-center">
                        Continue shopping
                      </ButtonLink>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setTab('verify')}
                    className="glass-panel group rounded-2xl p-4 text-left transition hover:border-emerald-500/40"
                  >
                    <QrCode className="h-6 w-6 text-emerald-500" />
                    <p className="mt-3 font-semibold">Scan a pack</p>
                    <p className="text-xs text-muted-foreground">Camera or batch ID</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('orders')}
                    className="glass-panel group rounded-2xl p-4 text-left transition hover:border-emerald-500/40"
                  >
                    <Truck className="h-6 w-6 text-teal-500" />
                    <p className="mt-3 font-semibold">Track orders</p>
                    <p className="text-xs text-muted-foreground">{orders.length} purchases</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('rewards')}
                    className="glass-panel group rounded-2xl p-4 text-left transition hover:border-emerald-500/40"
                  >
                    <Star className="h-6 w-6 text-amber-500" />
                    <p className="mt-3 font-semibold">Redeem points</p>
                    <p className="text-xs text-muted-foreground">{loyaltyPoints} pts ready</p>
                  </button>
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Purchased unique batches</h2>
                {orders.length === 0 ? (
                  <Card className="glass-panel">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      No purchases yet.{' '}
                      <Link to="/shop" className="text-emerald-600 underline dark:text-emerald-400">
                        Browse the shop
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {orders.map((order) => (
                      <Card key={order.orderId} className="glass-panel">
                        <CardHeader>
                          <CardTitle className="text-base">{order.herbName}</CardTitle>
                          <CardDescription className="break-all text-xs">
                            {order.qrPayload}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {orderQr[order.batchId] ? (
                            <img
                              src={orderQr[order.batchId]}
                              alt=""
                              className="mx-auto h-28 w-28"
                            />
                          ) : null}
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                              {order.status}
                            </span>
                            <span>{formatInr(order.amount)}</span>
                            <span>{order.method || order.provider || 'paid'}</span>
                            <span>{new Date(order.paidAt).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="glass"
                              size="sm"
                              onClick={async () => {
                                const q = await fetchHerbQrImage(order.batchId)
                                setOrderQr((p) => ({ ...p, [order.batchId]: q.qrImage }))
                              }}
                            >
                              Show unique QR
                            </Button>
                            <Button
                              type="button"
                              variant="neon"
                              size="sm"
                              onClick={() =>
                                navigate(`/verify?code=${encodeURIComponent(order.qrPayload)}`)
                              }
                            >
                              Verify this pack
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'verify' && (
              <div className="space-y-6">
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ScanLine className="h-5 w-5 text-emerald-500" />
                      Scan or enter QR
                    </CardTitle>
                    <CardDescription>
                      Confirm authenticity of any AyurAuth-issued pack
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <QrCode className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Enter QR code or batch ID"
                          className="w-full rounded-xl border border-white/15 bg-white/40 px-4 py-3 pl-10 backdrop-blur-md dark:bg-white/5"
                        />
                      </div>
                      <Button type="submit" variant="neon" className="gap-2">
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ScanLine className="h-4 w-4" />
                        )}
                        Verify
                      </Button>
                      <Button
                        type="button"
                        variant="glass"
                        className="gap-2"
                        onClick={() => setShowScanner(true)}
                      >
                        <Camera className="h-4 w-4" />
                        Scan
                      </Button>
                    </form>
                    {verifyStatus && message ? (
                      <VerifyStatusBanner
                        status={verifyStatus}
                        message={message}
                        labels={{
                          valid: 'Valid QR — Authentic batch verified',
                          invalid: 'Invalid QR — No matching record found',
                          malformed: 'Malformed QR — Not a valid AyurAuth code',
                          unverified: 'Record found but not AI-verified',
                        }}
                      />
                    ) : null}
                  </CardContent>
                </Card>

                <AnimatePresence>
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <Card className="glass-panel overflow-hidden border-emerald-500/20">
                        <div
                          className={cn(
                            'h-1.5',
                            result.isVerified
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                              : 'bg-red-500'
                          )}
                        />
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <CardTitle className="flex items-center gap-2 text-xl">
                                <Sprout className="h-5 w-5 text-emerald-500" />
                                {result.herbName}
                              </CardTitle>
                              <CardDescription>Batch {result.id}</CardDescription>
                            </div>
                            <StatusBadge verified={result.isVerified} />
                          </div>
                        </CardHeader>
                        <CardContent className="grid gap-6 md:grid-cols-2">
                          <img
                            src={result.imageUrl}
                            alt={result.herbName}
                            className="h-48 w-full rounded-xl object-cover"
                          />
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">AI confidence</span>
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {Math.round(result.aiConfidence * 100)}%
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-emerald-500" />
                              {result.latitude?.toFixed(4)}, {result.longitude?.toFixed(4)}
                            </div>
                            <div className="flex items-center gap-2">
                              <FlaskConical className="h-4 w-4 text-teal-500" />
                              {result.aiModel}
                            </div>
                            {result.isVerified ? (
                              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-800 dark:text-emerald-200">
                                AI verified authentic — safe to trust this pack.
                              </p>
                            ) : (
                              <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-700 dark:text-red-200">
                                Could not verify. Contact the seller.
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Button
                                variant="glass"
                                className="flex-1"
                                onClick={() => {
                                  reset()
                                  setQuery('')
                                }}
                              >
                                Verify another
                              </Button>
                              <Button
                                variant="neon"
                                className="flex-1"
                                onClick={() => navigate('/chat')}
                              >
                                Ask AI
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {scanHistory.length > 0 && (
                  <div>
                    <h3 className="mb-3 font-semibold">Recent scans</h3>
                    <div className="space-y-2">
                      {scanHistory.slice(0, 8).map((item, index) => (
                        <button
                          key={`${item.record.id}-${index}`}
                          type="button"
                          className="glass-panel flex w-full items-center justify-between rounded-xl p-3 text-left hover:border-emerald-500/30"
                          onClick={async () => {
                            setQuery(item.record.id)
                            await verify(item.record.id)
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {item.record.isVerified ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium">{item.record.herbName}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.scannedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'wishlist' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Saved batches</h2>
                {wishlist.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Heart items in the shop to save them here.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {wishlist.map((w) => (
                      <Card key={w.batchId} className="glass-panel">
                        <CardContent className="flex gap-4 pt-6">
                          {w.imageUrl ? (
                            <img
                              src={w.imageUrl}
                              alt=""
                              className="h-20 w-20 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-emerald-500/10">
                              <Heart className="h-6 w-6 text-rose-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-semibold">{w.herbName}</p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-300">
                              {formatInr(w.priceInr)}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                variant="neon"
                                onClick={() => {
                                  addToCart({
                                    batchId: w.batchId,
                                    herbName: w.herbName,
                                    priceInr: w.priceInr,
                                    imageUrl: w.imageUrl,
                                  })
                                  navigate(`/checkout/${w.batchId}`)
                                }}
                              >
                                Buy
                              </Button>
                              <Button
                                size="sm"
                                variant="glass"
                                onClick={() =>
                                  toggleWishlist({
                                    batchId: w.batchId,
                                    herbName: w.herbName,
                                    priceInr: w.priceInr,
                                    imageUrl: w.imageUrl,
                                  })
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'rewards' && (
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="h-5 w-5 text-amber-500" />
                    Authenticity rewards
                  </CardTitle>
                  <CardDescription>
                    Earn 1 pt per ₹10 spent + 5 pts per successful scan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="font-display text-4xl font-bold text-emerald-600 dark:text-emerald-300">
                    {loyaltyPoints} pts
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { pts: 50, label: 'Free AI herb consult' },
                      { pts: 120, label: 'Priority QR re-check' },
                      { pts: 250, label: '₹100 shop credit' },
                    ].map((r) => (
                      <div
                        key={r.pts}
                        className="rounded-2xl border border-white/15 bg-white/5 p-4"
                      >
                        <p className="text-sm font-semibold">{r.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{r.pts} points</p>
                        <Button
                          size="sm"
                          variant="glass"
                          className="mt-3 w-full"
                          disabled={loyaltyPoints < r.pts}
                        >
                          {loyaltyPoints >= r.pts ? 'Redeem' : 'Locked'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {tab === 'profile' && (
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="text-lg">Account</CardTitle>
                  <CardDescription>Consumer vault preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium">{user?.name}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                  </div>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    Order email receipts
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => {
                        setNotifyEmail(e.target.checked)
                        localStorage.setItem(
                          `ayurauth-prefs-${user?.email}`,
                          JSON.stringify({ notifyEmail: e.target.checked, notifyScan })
                        )
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    Scan success reminders
                    <input
                      type="checkbox"
                      checked={notifyScan}
                      onChange={(e) => {
                        setNotifyScan(e.target.checked)
                        localStorage.setItem(
                          `ayurauth-prefs-${user?.email}`,
                          JSON.stringify({ notifyEmail, notifyScan: e.target.checked })
                        )
                      }}
                    />
                  </label>
                  <Button
                    variant="glass"
                    onClick={() => {
                      localStorage.removeItem(`ayurauth-scan-history-${user?.email}`)
                      setScanHistory([])
                    }}
                  >
                    Clear scan history
                  </Button>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {showScanner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
              onClick={() => setShowScanner(false)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                className="glass-panel relative w-full max-w-md rounded-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="mb-4 text-lg font-semibold">Scan QR code</h3>
                <QRScanner onScan={handleQRScan} autoStart />
                <Button variant="glass" className="mt-4 w-full" onClick={() => setShowScanner(false)}>
                  Cancel
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
