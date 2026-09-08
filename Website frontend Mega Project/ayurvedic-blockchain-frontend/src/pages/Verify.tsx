import { useState, useEffect, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Search, QrCode, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { QRScanner } from '@/components/QRScanner'
import { VerifyStatusBanner } from '@/components/VerifyStatusBanner'
import { useVerify } from '@/hooks/useVerify'
import { decodeQrFromImageFile } from '@/lib/qrUtils'
import { verifyPackComplete, type VerifyResult } from '@/lib/api'
import type { HerbRecord } from '@/types/herb'

function HerbResultCard({ record, t }: { record: HerbRecord; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/20 bg-white/5 p-4"
    >
      <img src={record.imageUrl} alt={record.herbName} className="h-52 w-full rounded-2xl object-cover" />
      <div className="mt-4 grid gap-2 text-sm text-white/80">
        <p>
          <span className="text-white/60">{t('verify.herbInfo')}:</span> {record.herbName}
        </p>
        <p>
          <span className="text-white/60">{t('verify.origin')}:</span> {record.origin}
        </p>
        <p>
          <span className="text-white/60">{t('verify.aiConfidence')}:</span>{' '}
          {Math.round(record.aiConfidence * 100)}%
        </p>
        {record.blockchainHash ? (
          <p className="break-all">
            <span className="text-white/60">{t('verify.blockchainHash')}:</span>{' '}
            {record.blockchainHash.slice(0, 20)}…
          </p>
        ) : null}
        <p>
          <span className="text-white/60">{t('verify.verificationDate')}:</span>{' '}
          {new Date(record.timestamp).toLocaleString()}
        </p>
        <div>
          <StatusBadge verified={record.isVerified} />
        </div>
      </div>
    </motion.div>
  )
}

export default function Verify() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { record, verifyStatus, message, isLoading, verify, reset } = useVerify()
  const [query, setQuery] = useState(searchParams.get('code') || '')
  const [showScanner, setShowScanner] = useState(false)
  const [decodeError, setDecodeError] = useState('')
  const [leafFile, setLeafFile] = useState<File | null>(null)
  const [cnnBusy, setCnnBusy] = useState(false)
  const [complete, setComplete] = useState<VerifyResult | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setQuery(code)
      void verify(code)
    }
  }, [searchParams, verify])

  const statusLabels = {
    valid: t('verify.validQR'),
    invalid: t('verify.invalidQR'),
    malformed: t('verify.malformedQR'),
    unverified: t('verify.unverifiedQR'),
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault()
    setDecodeError('')
    setComplete(null)
    await verify(query)
  }

  const handleQRScan = async (data: string) => {
    setQuery(data)
    setShowScanner(false)
    setDecodeError('')
    setComplete(null)
    await verify(data)
  }

  const handleUploadQR = () => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*,.avif,.png,.jpg,.jpeg,.webp'
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setDecodeError('')
      setComplete(null)
      try {
        const decoded = await decodeQrFromImageFile(file)
        if (!decoded) {
          setDecodeError(t('verify.malformedQR'))
          return
        }
        setQuery(decoded)
        await verify(decoded)
      } catch (err) {
        setDecodeError(err instanceof Error ? err.message : t('verify.malformedQR'))
      }
    }
    fileInput.click()
  }

  const handleLeafPhoto = () => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'image/*,.avif,.png,.jpg,.jpeg,.webp'
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setLeafFile(file)
      if (!query.trim()) {
        setDecodeError('Scan or upload the unique pack QR first.')
        return
      }
      setCnnBusy(true)
      try {
        const result = await verifyPackComplete(query, file)
        setComplete(result)
      } catch (err) {
        setDecodeError(err instanceof Error ? err.message : 'CNN check failed')
      } finally {
        setCnnBusy(false)
      }
    }
    fileInput.click()
  }

  const displayStatus = complete?.status ?? verifyStatus
  const displayMessage = complete?.message ?? message
  const displayRecord = complete?.record ?? record

  return (
    <motion.div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 text-slate-900 dark:mesh-bg dark:text-white">
      <div className="noise-overlay fixed inset-0 z-[1] pointer-events-none hidden dark:block" aria-hidden />
      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('nav.backToHome')}
        </Link>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">{t('verify.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-slate-600 dark:text-white/70">{t('verify.description')}</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Scan or upload the unique pack QR, then upload a leaf photo. Authentic only if QR matches and CNN
                confidence is at least 70%. Demo QR: /sample-qr.png (or qr code sample 1.avif).
                {leafFile ? ` Leaf: ${leafFile.name}` : ''}
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="glass"
                  onClick={() => {
                    reset()
                    setComplete(null)
                    setShowScanner(!showScanner)
                  }}
                  className="gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  {showScanner ? t('verify.closeScanner') : t('verify.scanQR')}
                </Button>
                <Button type="button" variant="glass" onClick={handleUploadQR} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {t('verify.uploadQR')}
                </Button>
                <Button type="button" variant="glass" onClick={handleLeafPhoto} className="gap-2" disabled={cnnBusy}>
                  {cnnBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Leaf photo (CNN)
                </Button>
              </div>

              {showScanner && (
                <motion.div className="mb-4 rounded-lg border border-border/20 bg-muted p-4">
                  <QRScanner onScan={handleQRScan} autoStart />
                </motion.div>
              )}

              <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('verify.enterBatchId')}
                />
                <Button type="submit" variant="neon" className="justify-center gap-2" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {t('verify.verify')}
                </Button>
              </form>

              {decodeError ? <p className="mt-3 text-sm text-red-200">{decodeError}</p> : null}

              {!verifyStatus && message ? (
                <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {message}
                </p>
              ) : null}

              {displayStatus && displayMessage ? (
                <VerifyStatusBanner status={displayStatus} message={displayMessage} labels={statusLabels} />
              ) : null}

              {complete?.cnn ? (
                <p className="mt-2 text-sm">
                  CNN: {complete.cnn.predictedClass} ({Math.round(complete.cnn.confidence * 100)}%)
                  {complete.cnn.cnnOk ? ' — matches this batch' : ' — mismatch or low confidence'}
                </p>
              ) : null}

              <div className="mt-6">
                {isLoading ? (
                  <motion.div className="space-y-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-1/2" />
                  </motion.div>
                ) : null}

                {!isLoading && !displayRecord && !displayStatus ? (
                  <div className="rounded-2xl border border-white/20 bg-white/5 p-6 text-sm text-white/70">
                    {t('verify.enterIdPrompt')}
                  </div>
                ) : null}

                {!isLoading && displayRecord ? <HerbResultCard record={displayRecord} t={t} /> : null}
              </div>
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center gap-3">
            <ButtonLink to="/upload" variant="glass">
              {t('nav.upload')} New Herb
            </ButtonLink>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
