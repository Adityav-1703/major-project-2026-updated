const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Demo batch bound to the file `qr code sample 1.avif` (payload http://www.yuvikaherbs.com) */
export const SAMPLE_QR_BATCH_ID = 'd4e5f6a7-b8c9-4012-8345-6789abcdef01'

const SAMPLE_QR_ALIASES = new Set(
  [
    'http://www.yuvikaherbs.com',
    'https://www.yuvikaherbs.com',
    'http://yuvikaherbs.com',
    'https://yuvikaherbs.com',
    'www.yuvikaherbs.com',
    'yuvikaherbs.com',
    '8904372900543',
  ].map((s) => normalizeAlias(s))
)

export function normalizeAlias(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\/+$/, '')
}

/** Build canonical QR payload stored in DB and encoded in QR images */
export function buildQrPayload(batchId) {
  return `ayurauth://batch/${batchId}`
}

export function isSampleQrPayload(raw) {
  return SAMPLE_QR_ALIASES.has(normalizeAlias(raw))
}

/**
 * Parse scanned QR text into a batch ID.
 * @returns {{ batchId: string } | { malformed: true }}
 */
export function parseQrCode(raw) {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) {
    return { malformed: true }
  }

  if (isSampleQrPayload(trimmed)) {
    return { batchId: SAMPLE_QR_BATCH_ID }
  }

  const ayurauthMatch = trimmed.match(/^ayurauth:\/\/batch\/([0-9a-f-]{36})$/i)
  if (ayurauthMatch) {
    return { batchId: ayurauthMatch[1].toLowerCase() }
  }

  if (UUID_RE.test(trimmed)) {
    return { batchId: trimmed.toLowerCase() }
  }

  try {
    const url = new URL(trimmed)
    const pathId = url.pathname.split('/').filter(Boolean).pop()
    if (pathId && UUID_RE.test(pathId)) {
      return { batchId: pathId.toLowerCase() }
    }
  } catch {
    // not a URL
  }

  return { malformed: true }
}

export function toOrigin(latitude, longitude) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
}

export function fakeBlockchainHash(batchId) {
  let hash = 0
  for (let i = 0; i < batchId.length; i++) {
    hash = (hash << 5) - hash + batchId.charCodeAt(i)
    hash |= 0
  }
  return `0x${Math.abs(hash).toString(16).padStart(8, '0')}${batchId.replace(/-/g, '').slice(0, 24)}`
}

export function priceForHerbName(name) {
  let n = 0
  const s = String(name || '')
  for (let i = 0; i < s.length; i += 1) n += s.charCodeAt(i)
  return 149 + (n % 8) * 50
}

export function classesMatch(predicted, herbName) {
  const a = String(predicted || '').toLowerCase().replace(/[^a-z]/g, '')
  const b = String(herbName || '').toLowerCase().replace(/[^a-z]/g, '')
  if (!a || !b) return false
  if (a === b) return true
  if ((a === 'gauva' && b === 'guava') || (a === 'guava' && b === 'gauva')) return true
  if ((a === 'tulasi' && b === 'tulsi') || (a === 'tulsi' && b === 'tulasi')) return true
  return a.includes(b) || b.includes(a)
}
