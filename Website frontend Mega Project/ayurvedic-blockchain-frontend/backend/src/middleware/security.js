/**
 * Hardens the API against common injection vectors.
 * Express never mounts an XML body parser — we also reject XML content types
 * so XXE / XML injection cannot be introduced via Content-Type spoofing.
 */

const XML_CONTENT_TYPES = [
  'application/xml',
  'text/xml',
  'application/xhtml+xml',
  'application/atom+xml',
  'application/rss+xml',
  'image/svg+xml',
]

/** Reject any request that claims to send XML (prevents XXE / XML injection). */
export function rejectXmlPayloads(req, res, next) {
  const raw = String(req.headers['content-type'] || '').toLowerCase()
  if (!raw) return next()
  const type = raw.split(';')[0].trim()
  if (XML_CONTENT_TYPES.some((t) => type === t || type.endsWith('+xml'))) {
    return res.status(415).json({
      error: 'XML payloads are not accepted. Use application/json or multipart/form-data.',
      code: 'XML_REJECTED',
    })
  }
  next()
}

/** Strip control chars and obvious markup from free-text fields. */
export function sanitizeString(value, maxLen = 500) {
  if (typeof value !== 'string') return value
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .trim()
    .slice(0, maxLen)
}

export function sanitizeObject(obj, depth = 0) {
  if (depth > 6 || obj == null) return obj
  if (typeof obj === 'string') return sanitizeString(obj)
  if (Array.isArray(obj)) return obj.map((v) => sanitizeObject(v, depth + 1))
  if (typeof obj === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('$') || k.includes('.')) continue // block NoSQL operator injection
      out[k] = sanitizeObject(v, depth + 1)
    }
    return out
  }
  return obj
}

export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object' && !(req.body instanceof Buffer)) {
    req.body = sanitizeObject(req.body)
  }
  next()
}

export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
  res.setHeader('X-XSS-Protection', '0')
  next()
}
