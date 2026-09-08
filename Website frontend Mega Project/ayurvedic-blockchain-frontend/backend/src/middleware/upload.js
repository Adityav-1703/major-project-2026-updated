import multer from 'multer'

const MAX_BYTES = Number(process.env.MAX_UPLOAD_MB || 8) * 1024 * 1024

export const herbImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'))
      return
    }
    cb(null, true)
  },
})

export function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image file is too large' })
    }
    return res.status(400).json({ error: err.message })
  }
  if (err?.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message })
  }
  next(err)
}
