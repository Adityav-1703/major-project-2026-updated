import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, MapPinned, ScanEye, UploadCloud } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { useHerbData } from '@/context/HerbDataContext'
import { uploadHerbSchema, zodFieldErrors } from '@/lib/validation'

export default function Upload() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { uploadHerb } = useHerbData()
  const [herbName, setHerbName] = useState('')
  const [farmerId, setFarmerId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'herbName' | 'farmerId' | 'latitude' | 'longitude' | 'hasImage', string>>>({})
  const [isDragActive, setIsDragActive] = useState(false)
  const [lastUpload, setLastUpload] = useState<{
    recordId: string
    herbName: string
    confidence: number
    modelName: string
    predictedClass: string
    isVerified: boolean
    qrPayload: string
    qrImage: string
  } | null>(null)
  const [filePreview, setFilePreview] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/upload' } })
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (!file) {
      setFilePreview('')
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setFilePreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [file])

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragActive(false)
    const dropped = event.dataTransfer.files?.[0]
    if (!dropped || !dropped.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file.')
      return
    }
    setErrorMessage('')
    setSuccessMessage('')
    setLastUpload(null)
    setFile(dropped)
  }

  function fetchLocation() {
    setErrorMessage('')
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setIsLocating(false)
      },
      () => {
        setErrorMessage('Unable to fetch geo-location. Please allow location access.')
        setIsLocating(false)
      }
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')
    setFieldErrors({})

    const parsed = uploadHerbSchema.safeParse({
      herbName,
      farmerId,
      latitude: latitude ?? Number.NaN,
      longitude: longitude ?? Number.NaN,
      hasImage: Boolean(file),
    })
    if (!parsed.success) {
      setFieldErrors(zodFieldErrors(parsed.error))
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadHerb({
        herbName,
        farmerId,
        image: file,
        latitude,
        longitude,
      })

      setLastUpload({
        recordId: result.record.id,
        herbName: result.record.herbName,
        confidence: result.record.aiConfidence,
        modelName: result.record.aiModel,
        predictedClass: result.record.predictedClass || 'unknown',
        isVerified: result.record.isVerified,
        qrPayload: result.qrPayload,
        qrImage: result.qrImage,
      })

      if (!result.record.isVerified) {
        setErrorMessage(
          `AI verification below threshold (${Math.round(result.record.aiConfidence * 100)}% confidence). Batch saved as unverified — you can still view it on the dashboard.`
        )
      } else {
        setSuccessMessage(
          `Batch verified and saved (${Math.round(result.record.aiConfidence * 100)}% confidence). Scan the QR below or open the dashboard.`
        )
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <motion.div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 text-slate-900 dark:mesh-bg dark:text-white">
      <motion.div className="noise-overlay fixed inset-0 z-[1] hidden dark:block" aria-hidden />
      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-8 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Upload Herb Batch</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-slate-600 dark:text-white/70">
                Login required. Image is verified by the CNN service, stored on disk/Cloudinary (URL only in MongoDB).
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <label
                  onDrop={onDrop}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragActive(true)
                  }}
                  onDragLeave={() => setIsDragActive(false)}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition ${
                    fieldErrors.hasImage
                      ? 'border-red-400 bg-red-500/5'
                      : isDragActive
                        ? 'border-emerald-300 bg-emerald-500/10'
                        : 'border-black/15 bg-black/[0.03] dark:border-white/25 dark:bg-white/5'
                  }`}
                >
                  <UploadCloud className="h-7 w-7 text-emerald-600 dark:text-emerald-200" />
                  <p className="mt-2 text-sm text-slate-700 dark:text-white/80">Drag and drop herb image</p>
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0] ?? null
                      if (!selectedFile) return
                      setFile(selectedFile)
                      setErrorMessage('')
                      setSuccessMessage('')
                      setLastUpload(null)
                    }}
                  />
                </label>
                {fieldErrors.hasImage ? (
                  <p className="text-xs text-red-600 dark:text-red-200">{fieldErrors.hasImage}</p>
                ) : null}

                {filePreview ? (
                  <img src={filePreview} alt="Herb preview" className="h-44 w-full rounded-2xl object-cover" />
                ) : null}

                <div>
                  <Input
                    value={herbName}
                    onChange={(e) => {
                      setHerbName(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, herbName: undefined }))
                    }}
                    placeholder="Herb Name"
                    className={fieldErrors.herbName ? 'border-red-400' : ''}
                  />
                  {fieldErrors.herbName ? <p className="mt-1 text-xs text-red-600 dark:text-red-200">{fieldErrors.herbName}</p> : null}
                </div>
                <div>
                  <Input
                    value={farmerId}
                    onChange={(e) => {
                      setFarmerId(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, farmerId: undefined }))
                    }}
                    placeholder="Farmer ID"
                    className={fieldErrors.farmerId ? 'border-red-400' : ''}
                  />
                  {fieldErrors.farmerId ? <p className="mt-1 text-xs text-red-600 dark:text-red-200">{fieldErrors.farmerId}</p> : null}
                </div>

                <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-3 dark:border-white/20 dark:bg-white/5">
                  <Button type="button" variant="glass" onClick={fetchLocation} disabled={isLocating}>
                    {isLocating ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching Location...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <MapPinned className="h-4 w-4" />
                        Auto Fetch Geo-location
                      </span>
                    )}
                  </Button>
                  <p className="mt-2 text-xs text-slate-600 dark:text-white/70">
                    {latitude !== null && longitude !== null
                      ? `Location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
                      : 'No location captured yet.'}
                  </p>
                  {fieldErrors.latitude || fieldErrors.longitude ? (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-200">
                      {fieldErrors.latitude || fieldErrors.longitude}
                    </p>
                  ) : null}
                </div>

                {isUploading ? (
                  <motion.div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-200">
                    <p className="inline-flex items-center gap-2">
                      <ScanEye className="h-4 w-4" />
                      Running CNN verification via API...
                    </p>
                  </motion.div>
                ) : null}

                {errorMessage ? <p className="text-sm text-red-600 dark:text-red-200">{errorMessage}</p> : null}
                {successMessage ? <p className="text-sm text-emerald-700 dark:text-emerald-200">{successMessage}</p> : null}

                {lastUpload ? (
                  <div className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-100">
                      CNN result — {lastUpload.herbName}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-white/80">
                      Model: {lastUpload.modelName} · Class: {lastUpload.predictedClass} · Confidence:{' '}
                      {Math.round(lastUpload.confidence * 100)}% ·{' '}
                      {lastUpload.isVerified ? 'Verified' : 'Unverified'}
                    </p>
                    <p className="break-all text-xs text-slate-600 dark:text-white/60">
                      Batch ID: {lastUpload.recordId}
                    </p>
                    <p className="break-all text-xs text-slate-600 dark:text-white/60">
                      QR payload: {lastUpload.qrPayload}
                    </p>
                    {lastUpload.qrImage ? (
                      <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 dark:bg-black/20">
                        <img
                          src={lastUpload.qrImage}
                          alt="Batch QR code"
                          className="h-48 w-48 rounded-lg"
                        />
                        <p className="text-xs text-slate-500 dark:text-white/50">
                          Scan on the Verify page to test consumer lookup
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button type="submit" variant="neon" size="lg" disabled={isUploading} className="w-full">
                    {isUploading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      'Submit Batch'
                    )}
                  </Button>
                  <ButtonLink to="/dashboard" variant="glass" size="lg" className="w-full justify-center">
                    View Dashboard
                  </ButtonLink>
                  {lastUpload ? (
                    <Button
                      type="button"
                      variant="glass"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        setLastUpload(null)
                        setSuccessMessage('')
                        setErrorMessage('')
                        setHerbName('')
                        setFarmerId('')
                        setFile(null)
                        setLatitude(null)
                        setLongitude(null)
                      }}
                    >
                      Upload another batch
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

