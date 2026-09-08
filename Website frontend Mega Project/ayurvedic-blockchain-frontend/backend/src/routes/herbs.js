import { Router } from 'express'
import QRCode from 'qrcode'
import { v4 as uuidv4 } from 'uuid'
import { buildQrPayload, fakeBlockchainHash, priceForHerbName, toOrigin } from '../utils/qr.js'
import {
  createHerb,
  findHerbByBatchId,
  listHerbs,
  mapHerbList,
  serializeHerb,
} from '../services/repository.js'
import { requireAuth } from '../middleware/auth.js'
import { herbImageUpload, handleMulterError } from '../middleware/upload.js'
import { validateBody, createHerbBodySchema } from '../validation/schemas.js'
import { persistImage } from '../services/storage.js'
import { predictHerbImage } from '../services/aiClient.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const herbs = await listHerbs()
    res.json({ records: mapHerbList(herbs) })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const herb = await findHerbByBatchId(req.params.id)
    if (!herb) {
      return res.status(404).json({ error: 'Record not found' })
    }
    res.json({ record: serializeHerb(herb) })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/qr-image', async (req, res, next) => {
  try {
    const herb = await findHerbByBatchId(req.params.id)
    if (!herb) {
      return res.status(404).json({ error: 'Record not found' })
    }
    const dataUrl = await QRCode.toDataURL(herb.qrPayload, { margin: 2, width: 280 })
    res.json({ qrPayload: herb.qrPayload, qrImage: dataUrl })
  } catch (err) {
    next(err)
  }
})

/** Multipart upload: image + metadata → CNN predict → store URL only in MongoDB */
router.post(
  '/',
  requireAuth,
  herbImageUpload.single('image'),
  handleMulterError,
  validateBody(createHerbBodySchema),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required (field name: image)' })
      }

      const { herbName, farmerId, latitude, longitude } = req.validated

      const prediction = await predictHerbImage(req.file.buffer)
      const imageUrl = await persistImage(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname
      )

      const batchId = uuidv4()
      const qrPayload = buildQrPayload(batchId)
      const herbDoc = {
        batchId,
        herbName,
        farmerId,
        imageUrl,
        origin: toOrigin(latitude, longitude),
        latitude,
        longitude,
        isVerified: prediction.isAuthentic,
        aiConfidence: prediction.confidence,
        aiModel: prediction.modelName,
        predictedClass: prediction.predictedClass,
        blockchainHash: fakeBlockchainHash(batchId),
        qrPayload,
        uploadedBy: req.user.sub,
        sold: false,
        priceInr: priceForHerbName(herbName),
        qrAliases: [],
      }
      const herb = await createHerb(herbDoc)

      const qrImage = await QRCode.toDataURL(qrPayload, { margin: 2, width: 280 })
      res.status(201).json({
        record: serializeHerb(herb),
        qrPayload,
        qrImage,
        prediction,
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
