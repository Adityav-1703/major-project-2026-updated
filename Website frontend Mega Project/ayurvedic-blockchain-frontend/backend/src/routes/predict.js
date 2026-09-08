import { Router } from 'express'
import { herbImageUpload, handleMulterError } from '../middleware/upload.js'
import { optionalAuth } from '../middleware/auth.js'
import { predictHerbImage } from '../services/aiClient.js'

const router = Router()

/** Preview CNN result before full batch upload (optional) */
router.post(
  '/',
  optionalAuth,
  herbImageUpload.single('image'),
  handleMulterError,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Image file is required' })
      }
      const prediction = await predictHerbImage(req.file.buffer)
      res.json({
        isAuthentic: prediction.isAuthentic,
        confidence: prediction.confidence,
        modelName: prediction.modelName,
        predictedClass: prediction.predictedClass,
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
