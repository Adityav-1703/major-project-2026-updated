import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { v4 as uuidv4 } from 'uuid'
import { v2 as cloudinary } from 'cloudinary'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads')

function useCloudinary() {
  if (process.env.USE_LOCAL_UPLOADS === 'true') {
    return false
  }
  return Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  )
}

if (useCloudinary()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
}

export function getImageStorageMode() {
  return useCloudinary() ? 'cloudinary' : 'local-disk'
}

export async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
}

async function persistImageLocal(buffer, originalname = 'herb.jpg') {
  await ensureUploadsDir()
  const ext = path.extname(originalname) || '.jpg'
  const filename = `${uuidv4()}${ext}`
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer)
  const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`
  return `${base}/uploads/${filename}`
}

/**
 * Persist image buffer → public URL (Cloudinary or local /uploads).
 */
export async function persistImage(buffer, mimetype, originalname = 'herb.jpg') {
  if (useCloudinary()) {
    try {
      const base64 = `data:${mimetype};base64,${buffer.toString('base64')}`
      const result = await cloudinary.uploader.upload(base64, {
        folder: process.env.CLOUDINARY_FOLDER || 'ayurauth/herbs',
        resource_type: 'image',
      })
      return result.secure_url
    } catch (err) {
      console.warn(
        `[storage] Cloudinary failed (${err.message}). Saving to local /uploads instead. ` +
          'Fix CLOUDINARY_CLOUD_NAME in backend/.env (Dashboard → Product environment credentials), ' +
          'or set USE_LOCAL_UPLOADS=true for development.'
      )
      return persistImageLocal(buffer, originalname)
    }
  }

  return persistImageLocal(buffer, originalname)
}
