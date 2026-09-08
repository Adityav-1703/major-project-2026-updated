import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2 } from 'lucide-react'
import { decodeQrFromVideoFrame } from '@/lib/qrUtils'

interface QRScannerProps {
  onScan: (data: string) => void
  autoStart?: boolean
}

const SCAN_INTERVAL_MS = 250

export function QRScanner({ onScan, autoStart = false }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scanning, setScanning] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const busyRef = useRef(false)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    const video = videoRef.current
    if (video) {
      video.onloadedmetadata = null
      video.srcObject = null
    }
  }, [])

  const stopScan = useCallback(() => {
    setScanning(false)
    setVideoReady(false)
    setHint(null)
    releaseStream()
  }, [releaseStream])

  const tryDecodeFrame = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return null
    return decodeQrFromVideoFrame(video)
  }, [])

  const handleDecoded = useCallback(
    (decoded: string) => {
      setHint(null)
      onScanRef.current(decoded)
      stopScan()
    },
    [stopScan]
  )

  const captureNow = useCallback(async () => {
    setError(null)
    setIsCapturing(true)
    try {
      const decoded = await tryDecodeFrame()
      if (decoded) {
        handleDecoded(decoded)
        return
      }
      setHint('No QR detected. Move closer, hold steady, tap Capture again, or use Upload QR.')
    } finally {
      setIsCapturing(false)
    }
  }, [tryDecodeFrame, handleDecoded])

  const startScan = useCallback(async () => {
    try {
      setError(null)
      setHint(null)
      setVideoReady(false)
      releaseStream()

      const constraints: MediaStreamConstraints[] = [
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: true, audio: false },
      ]

      let stream: MediaStream | null = null
      for (const constraint of constraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          break
        } catch {
          // try next constraint
        }
      }
      if (!stream) throw new Error('no camera')

      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const markReady = () => {
        void video
          .play()
          .then(() => {
            setVideoReady(true)
            setHint('Hold QR in the green box, or tap Capture now.')
          })
          .catch(() => {
            setError('Could not start camera preview')
            stopScan()
          })
      }

      video.onloadedmetadata = markReady
      video.srcObject = stream
      setScanning(true)

      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        markReady()
      }
    } catch {
      setError('Camera unavailable. Use Upload QR or paste the batch code below.')
      setScanning(false)
    }
  }, [releaseStream, stopScan])

  useEffect(() => {
    if (!scanning || !videoReady) return

    const intervalId = window.setInterval(() => {
      if (busyRef.current || isCapturing) return
      busyRef.current = true
      void tryDecodeFrame()
        .then((decoded) => {
          if (decoded) handleDecoded(decoded)
        })
        .finally(() => {
          busyRef.current = false
        })
    }, SCAN_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [scanning, videoReady, isCapturing, tryDecodeFrame, handleDecoded])

  useEffect(() => {
    if (autoStart) {
      void startScan()
    }
    return () => {
      releaseStream()
    }
  }, [autoStart, startScan, releaseStream])

  return (
    <div className="space-y-4">
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className="block min-h-[260px] w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {scanning && videoReady ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <div className="h-56 w-56 rounded-xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-200">{error}</p> : null}
      {hint && !error ? <p className="text-sm text-slate-600 dark:text-white/70">{hint}</p> : null}
      {scanning && !videoReady ? (
        <p className="text-sm text-slate-500 dark:text-white/60">Starting camera…</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!scanning ? (
          <Button type="button" onClick={() => void startScan()} className="flex-1">
            Start QR Scan
          </Button>
        ) : (
          <>
            <Button
              type="button"
              onClick={() => void captureNow()}
              variant="neon"
              className="flex-1"
              disabled={!videoReady || isCapturing}
            >
              {isCapturing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Capture now
                </span>
              )}
            </Button>
            <Button
              type="button"
              onClick={stopScan}
              variant="glass"
              className="flex-1"
            >
              Stop
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-slate-500 dark:text-white/50">
        Tip: On a laptop, show the QR on a phone screen or print it. Screen-to-webcam scanning can fail
        due to glare — use <strong>Capture now</strong> while holding still, or Upload QR.
      </p>
    </div>
  )
}
