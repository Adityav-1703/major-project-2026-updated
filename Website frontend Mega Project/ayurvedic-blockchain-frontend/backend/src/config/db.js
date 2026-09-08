import dns from 'node:dns'
import mongoose from 'mongoose'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * On some Windows networks Node fails Atlas SRV lookups (querySrv ECONNREFUSED)
 * while the system resolver works. Use public DNS for mongodb+srv URIs.
 */
function configureDnsForAtlas(uri) {
  if (!uri.startsWith('mongodb+srv://')) return

  const fromEnv = process.env.DNS_SERVERS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const servers = fromEnv?.length ? fromEnv : ['8.8.8.8', '1.1.1.1', '8.8.4.4']
  dns.setServers(servers)
}

/**
 * Connect to MongoDB with exponential backoff (helps when Atlas/local isn't ready yet).
 */
export async function connectDB(maxAttempts = 10) {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ayurauth'
  configureDnsForAtlas(uri)
  mongoose.set('strictQuery', true)

  let delayMs = 1000

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 15_000,
        socketTimeoutMS: 45_000,
      })
      console.log(`MongoDB connected (attempt ${attempt}) → ${mongoose.connection.name}`)
      return
    } catch (err) {
      const isLast = attempt === maxAttempts
      console.warn(
        `MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${err.message}`
      )
      if (isLast) {
        throw new Error(
          `Could not connect to MongoDB after ${maxAttempts} attempts. Check MONGODB_URI and network access.`
        )
      }
      console.warn(`Retrying in ${delayMs}ms...`)
      await sleep(delayMs)
      delayMs = Math.min(delayMs * 2, 30_000)
    }
  }
}
