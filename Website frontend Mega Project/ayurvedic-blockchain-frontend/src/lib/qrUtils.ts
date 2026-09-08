import jsQR from 'jsqr'

const JSQR_OPTIONS = {
  inversionAttempts: 'attemptBoth' as const,
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
}

let barcodeDetectorPromise: Promise<BarcodeDetectorLike | null> | undefined

async function getBarcodeDetector(): Promise<BarcodeDetectorLike | null> {
  if (barcodeDetectorPromise) return barcodeDetectorPromise

  barcodeDetectorPromise = (async () => {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      return null
    }
    try {
      const Detector = (
        window as unknown as {
          BarcodeDetector: new (opts: { formats: string[] }) => BarcodeDetectorLike
        }
      ).BarcodeDetector
      return new Detector({ formats: ['qr_code'] })
    } catch {
      return null
    }
  })()

  return barcodeDetectorPromise
}

/** Downscale large frames so jsQR runs fast and reliably on live video */
export function scaleToMaxEdge(width: number, height: number, maxEdge = 720) {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height }
  }
  const scale = maxEdge / Math.max(width, height)
  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
  }
}

export function decodeQrFromImageData(imageData: ImageData): string | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, JSQR_OPTIONS)
  return code?.data ?? null
}

function decodeFromContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): string | null {
  const imageData = ctx.getImageData(0, 0, width, height)
  return decodeQrFromImageData(imageData)
}

/** Decode QR from a canvas ImageData source (video frame or image) */
export function decodeQrFromCanvas(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge = 720
): string | null {
  const { width, height } = scaleToMaxEdge(sourceWidth, sourceHeight, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, width, height)
  return decodeFromContext(ctx, width, height)
}

/** Decode center crop (matches on-screen scan box) */
export function decodeQrFromCanvasCenter(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  cropRatio = 0.72,
  maxEdge = 640
): string | null {
  const cropSize = Math.floor(Math.min(sourceWidth, sourceHeight) * cropRatio)
  const sx = Math.floor((sourceWidth - cropSize) / 2)
  const sy = Math.floor((sourceHeight - cropSize) / 2)
  const { width, height } = scaleToMaxEdge(cropSize, cropSize, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(source, sx, sy, cropSize, cropSize, 0, 0, width, height)
  return decodeFromContext(ctx, width, height)
}

/** Best-effort decode for live camera — native API + jsQR at multiple scales */
export async function decodeQrFromVideoFrame(video: HTMLVideoElement): Promise<string | null> {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return null

  const detector = await getBarcodeDetector()
  if (detector) {
    try {
      const codes = await detector.detect(video)
      const value = codes.find((c) => c.rawValue)?.rawValue
      if (value) return value
    } catch {
      // fall through to jsQR
    }
  }

  const attempts = [
    () => decodeQrFromCanvasCenter(video, w, h, 0.72, 640),
    () => decodeQrFromCanvasCenter(video, w, h, 0.85, 800),
    () => decodeQrFromCanvas(video, w, h, 720),
    () => decodeQrFromCanvas(video, w, h, 480),
  ]

  for (const attempt of attempts) {
    const value = attempt()
    if (value) return value
  }

  return null
}

async function loadImageFromFile(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file)
  } catch {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Could not read image'))
      reader.readAsDataURL(file)
    })
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not decode image (try PNG)'))
      img.src = dataUrl
    })
  }
}

/** Decode QR from an image file (upload). AVIF/PNG/JPEG; falls back if createImageBitmap fails. */
export async function decodeQrFromImageFile(file: File): Promise<string | null> {
  try {
    const source = await loadImageFromFile(file)
    const w =
      'naturalWidth' in source && (source as HTMLImageElement).naturalWidth
        ? (source as HTMLImageElement).naturalWidth
        : source.width
    const h =
      'naturalHeight' in source && (source as HTMLImageElement).naturalHeight
        ? (source as HTMLImageElement).naturalHeight
        : source.height
    const result =
      decodeQrFromCanvas(source, w, h, 800) ??
      decodeQrFromCanvasCenter(source, w, h, 0.9, 800) ??
      decodeQrFromCanvas(source, w, h, 480)
    if (source instanceof ImageBitmap) source.close()
    return result
  } catch {
    return null
  }
}

/** Decode QR from a data URL */
export function decodeQrFromDataUrl(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve(
        decodeQrFromCanvas(img, img.width, img.height, 800) ??
          decodeQrFromCanvasCenter(img, img.width, img.height, 0.9, 800)
      )
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}
