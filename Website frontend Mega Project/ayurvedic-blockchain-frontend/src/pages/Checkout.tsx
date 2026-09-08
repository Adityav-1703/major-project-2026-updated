import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CreditCard, Loader2, Lock, ShieldCheck } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  confirmPayment,
  createPayment,
  fetchHerbById,
  fetchHerbQrImage,
  fetchPaymentConfig,
  type PaymentConfig,
} from '@/lib/api'
import { formatInr, priceForHerbName } from '@/lib/price'
import { openRazorpayCheckout } from '@/lib/razorpay'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { SpaNav } from '@/components/layout/SpaNav'
import type { HerbRecord } from '@/types/herb'

export default function Checkout() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { removeFromCart } = useCart()
  const [record, setRecord] = useState<HerbRecord | null>(null)
  const [qrImage, setQrImage] = useState('')
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [done, setDone] = useState<{ orderId: string; qrPayload: string } | null>(null)

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  useEffect(() => {
    fetchPaymentConfig()
      .then(setConfig)
      .catch(() => setConfig({ provider: 'secure_demo', keyId: null, currency: 'INR', demo: true }))
  }, [])

  useEffect(() => {
    if (!batchId) return
    fetchHerbById(batchId)
      .then(async (r) => {
        setRecord(r)
        try {
          const q = await fetchHerbQrImage(r.id)
          setQrImage(q.qrImage)
        } catch {
          /* ignore */
        }
      })
      .catch((e: Error) => setError(e.message))
  }, [batchId])

  async function pay() {
    if (!record) return
    setPaying(true)
    setError('')
    try {
      const { intent } = await createPayment(record.id)

      if (intent.provider === 'razorpay' && intent.keyId) {
        await new Promise<void>((resolve, reject) => {
          openRazorpayCheckout({
            key: intent.keyId!,
            amount: intent.amountPaise,
            currency: intent.currency,
            name: 'AyurAuth',
            description: `Authentic ${intent.herbName} batch`,
            order_id: intent.orderId,
            prefill: { email: user?.email, name: user?.name },
            theme: { color: '#059669' },
            handler: async (response) => {
              try {
                const result = await confirmPayment({
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                })
                removeFromCart(record.id)
                setDone({
                  orderId: result.order.orderId,
                  qrPayload: result.order.qrPayload,
                })
                resolve()
              } catch (e) {
                reject(e)
              }
            },
            modal: {
              ondismiss: () => reject(new Error('Payment cancelled')),
            },
          }).catch(reject)
        })
      } else {
        const result = await confirmPayment({
          orderId: intent.orderId,
          demoToken: intent.demoToken,
        })
        removeFromCart(record.id)
        setDone({
          orderId: result.order.orderId,
          qrPayload: result.order.qrPayload,
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  const price = record ? record.priceInr || priceForHerbName(record.herbName) : 0
  const isDemo = config?.demo !== false && config?.provider !== 'razorpay'

  return (
    <div className="min-h-screen spa-surface text-foreground">
      <div className="noise-overlay fixed inset-0 z-[1] opacity-[0.035]" aria-hidden />
      <div className="relative z-10 mx-auto max-w-lg px-4 pb-16 pt-4">
        <SpaNav />
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shop
        </Link>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-panel mt-6 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Lock className="h-5 w-5 text-emerald-500" />
                Secure checkout
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {isDemo
                  ? 'Signed demo gateway active — add Razorpay keys for live UPI/cards.'
                  : 'Powered by Razorpay · PCI-compliant · signature-verified on server'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              {record && !done ? (
                <>
                  <div className="flex gap-4">
                    {record.imageUrl ? (
                      <img
                        src={record.imageUrl}
                        alt=""
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="text-lg font-semibold">{record.herbName}</p>
                      <p className="text-xs text-muted-foreground">Batch {record.id}</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-300">
                        {formatInr(price)}
                      </p>
                    </div>
                  </div>

                  {record.sold ? (
                    <p className="text-sm">This unique batch is already sold.</p>
                  ) : (
                    <>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          Server-side payment signature verification
                        </li>
                        <li className="flex items-center gap-2">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          No XML parsers — JSON-only API (XXE-safe)
                        </li>
                        <li className="flex items-center gap-2">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          Unique pack QR issued only after paid confirmation
                        </li>
                      </ul>
                      <Button
                        variant="neon"
                        className="w-full gap-2"
                        onClick={pay}
                        disabled={paying}
                      >
                        {paying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {isDemo ? 'Pay securely (demo)' : 'Pay with Razorpay'} · {formatInr(price)}
                      </Button>
                    </>
                  )}
                </>
              ) : null}

              {done ? (
                <div className="space-y-3 text-center">
                  <ShieldCheck className="mx-auto h-10 w-10 text-emerald-500" />
                  <p className="font-semibold">Payment verified</p>
                  <p className="text-sm text-muted-foreground">
                    Order {done.orderId.slice(0, 8)}…
                  </p>
                  {qrImage ? (
                    <img src={qrImage} alt="Your unique QR" className="mx-auto h-36 w-36" />
                  ) : null}
                  <p className="break-all text-xs text-muted-foreground">{done.qrPayload}</p>
                  <ButtonLink
                    to={`/verify?code=${encodeURIComponent(done.qrPayload)}`}
                    variant="neon"
                    className="w-full justify-center"
                  >
                    Verify this pack
                  </ButtonLink>
                  <ButtonLink to="/consumer" variant="glass" className="w-full justify-center">
                    Open my dashboard
                  </ButtonLink>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
