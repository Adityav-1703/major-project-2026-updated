import { Router } from 'express'
import { parseQrCode, classesMatch } from '../utils/qr.js'
import { findHerbByBatchId, findHerbByCode, serializeHerb } from '../services/repository.js'
import { validateBody, verifySchema } from '../validation/schemas.js'
import { herbImageUpload, handleMulterError } from '../middleware/upload.js'
import { optionalAuth } from '../middleware/auth.js'
import { predictHerbImage } from '../services/aiClient.js'

const router = Router()
const THRESHOLD = Number(process.env.AI_VERIFY_THRESHOLD || 0.7)

async function lookupHerb(code) {
  const parsed = parseQrCode(code)
  if (!parsed.malformed) {
    const byId = await findHerbByBatchId(parsed.batchId)
    if (byId) return { herb: byId, malformed: false }
  }
  const byCode = await findHerbByCode(code)
  if (byCode) return { herb: byCode, malformed: false }
  if (parsed.malformed) return { herb: null, malformed: true }
  return { herb: null, malformed: false }
}

function qrStatus(herb) {
  if (!herb.isVerified) {
    return {
      status: 'unverified',
      message: 'A record exists but this batch did not pass listing AI verification.',
    }
  }
  return {
    status: 'valid',
    message: 'Unique batch QR matched. This herb is registered as authentic.',
  }
}

router.post('/', validateBody(verifySchema), async (req, res, next) => {
  try {
    const { code } = req.validated
    const { herb, malformed } = await lookupHerb(code)

    if (malformed && !herb) {
      return res.json({
        status: 'malformed',
        message: 'This QR code is not a valid AyurAuth batch code.',
        record: null,
      })
    }

    if (!herb) {
      return res.json({
        status: 'invalid',
        message: 'No herb record found for this QR code. It may be counterfeit or expired.',
        record: null,
      })
    }

    const { status, message } = qrStatus(herb)
    return res.json({
      status,
      message,
      record: serializeHerb(herb),
    })
  } catch (err) {
    next(err)
  }
})

/** QR + optional CNN leaf photo. Authentic only when both pass. */
router.post(
  '/complete',
  optionalAuth,
  herbImageUpload.single('image'),
  handleMulterError,
  async (req, res, next) => {
    try {
      const code = String(req.body?.code || '').trim()
      if (!code) {
        return res.status(400).json({ error: "Missing 'code' (QR payload or batch ID)" })
      }

      const { herb, malformed } = await lookupHerb(code)
      if (malformed && !herb) {
        return res.json({
          status: 'malformed',
          message: 'This QR code is not a valid AyurAuth batch code.',
          record: null,
          cnn: null,
        })
      }
      if (!herb) {
        return res.json({
          status: 'invalid',
          message: 'No herb record found for this QR code.',
          record: null,
          cnn: null,
        })
      }

      const qr = qrStatus(herb)
      let cnn = null
      if (req.file) {
        const prediction = await predictHerbImage(req.file.buffer)
        const classOk = classesMatch(prediction.predictedClass, herb.herbName) ||
          classesMatch(prediction.predictedClass, herb.predictedClass)
        const cnnOk = prediction.confidence >= THRESHOLD && classOk
        cnn = {
          ...prediction,
          classOk,
          cnnOk,
        }
        if (qr.status === 'valid' && cnnOk) {
          return res.json({
            status: 'valid',
            message: 'Authentic pack: unique QR matched and CNN confirmed the leaf.',
            record: serializeHerb(herb),
            cnn,
          })
        }
        return res.json({
          status: 'unverified',
          message: qr.status !== 'valid'
            ? qr.message
            : `QR matched, but CNN did not confirm this herb (predicted ${prediction.predictedClass} at ${Math.round(prediction.confidence * 100)}%).`,
          record: serializeHerb(herb),
          cnn,
        })
      }

      return res.json({
        status: qr.status,
        message: `${qr.message} Upload a leaf photo to complete CNN authenticity.`,
        record: serializeHerb(herb),
        cnn: null,
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
