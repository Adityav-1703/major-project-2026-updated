import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Heart, MapPin, QrCode, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SpaNav } from '@/components/layout/SpaNav'
import { fetchHerbQrImage, fetchHerbRecords } from '@/lib/api'
import { formatInr, priceForHerbName } from '@/lib/price'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import type { HerbRecord } from '@/types/herb'

async function downloadQr(id: string, name: string) {
  const { qrImage, qrPayload } = await fetchHerbQrImage(id)
  const a = document.createElement('a')
  a.href = qrImage
  a.download = `${name.replace(/\s+/g, '-').toLowerCase()}-unique-qr.png`
  a.click()
  return qrPayload
}

export default function Shop() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [records, setRecords] = useState<HerbRecord[]>([])
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [error, setError] = useState('')
  const [qrPreview, setQrPreview] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchHerbRecords()
      .then(setRecords)
      .catch((err: Error) => setError(err.message))
  }, [])

  const listings = useMemo(() => {
    const rows = verifiedOnly ? records.filter((r) => r.isVerified) : records
    return rows
  }, [records, verifiedOnly])

  return (
    <div className="min-h-screen spa-surface text-foreground">
      <div className="noise-overlay fixed inset-0 z-[1] opacity-[0.035]" aria-hidden />
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6">
        <SpaNav />

        <h1 className="font-display mt-8 text-3xl font-bold sm:text-4xl">{t('shop.title')}</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-white/70">
          Each listing is a unique batch with its own QR. Buy, pay, then verify the pack with that QR and a leaf photo.
        </p>

        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
          />
          {t('shop.onlyVerified')}
        </label>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        {listings.length === 0 && !error ? (
          <p className="mt-8 text-sm text-slate-600 dark:text-white/70">{t('shop.empty')}</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((record, index) => {
              const price = record.priceInr || priceForHerbName(record.herbName)
              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Card className="h-full overflow-hidden">
                    <img
                      src={record.imageUrl}
                      alt={record.herbName}
                      className="h-44 w-full object-cover"
                    />
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-lg font-semibold">{record.herbName}</h2>
                        <StatusBadge verified={record.isVerified} />
                      </div>
                      <p className="text-xs text-muted-foreground break-all">
                        Unique QR: {record.qrPayload || record.uniqueQr}
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {t('shop.origin')}: {record.origin}
                      </p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {t('shop.aiScore')}: {Math.round(record.aiConfidence * 100)}%
                      </p>
                      <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatInr(price)}
                      </p>
                      {qrPreview[record.id] ? (
                        <img src={qrPreview[record.id]} alt="Unique batch QR" className="mx-auto h-28 w-28" />
                      ) : null}
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          variant="glass"
                          size="sm"
                          className="w-full gap-2"
                          onClick={async () => {
                            const { qrImage } = await fetchHerbQrImage(record.id)
                            setQrPreview((p) => ({ ...p, [record.id]: qrImage }))
                            await downloadQr(record.id, record.herbName)
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Show / download unique QR
                        </Button>
                        {record.sold ? (
                          <p className="rounded-lg bg-slate-500/20 px-3 py-2 text-center text-sm">
                            Sold — unique batch already purchased
                          </p>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="neon"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                if (!isAuthenticated) {
                                  navigate('/login')
                                  return
                                }
                                addToCart({
                                  batchId: record.id,
                                  herbName: record.herbName,
                                  priceInr: price,
                                  imageUrl: record.imageUrl,
                                  isVerified: record.isVerified,
                                })
                                navigate(`/checkout/${record.id}`)
                              }}
                            >
                              Buy this batch
                            </Button>
                            <Button
                              type="button"
                              variant="glass"
                              size="sm"
                              aria-label="Wishlist"
                              onClick={() =>
                                toggleWishlist({
                                  batchId: record.id,
                                  herbName: record.herbName,
                                  priceInr: price,
                                  imageUrl: record.imageUrl,
                                })
                              }
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  isWishlisted(record.id) ? 'fill-rose-500 text-rose-500' : ''
                                }`}
                              />
                            </Button>
                          </div>
                        )}
                        <ButtonLink
                          to={`/verify?code=${encodeURIComponent(record.qrPayload || record.id)}`}
                          variant="glass"
                          size="sm"
                          className="w-full justify-center gap-1"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          Verify pack
                        </ButtonLink>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
