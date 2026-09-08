import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireDb } from './middleware/requireDb.js'
import {
  rejectXmlPayloads,
  sanitizeBody,
  securityHeaders,
} from './middleware/security.js'
import { getStorageMode, initStorage, isStorageReady } from './services/repository.js'
import { ensureUploadsDir, getImageStorageMode, UPLOADS_DIR } from './services/storage.js'
import { getPublicPaymentConfig } from './services/payments.js'
import authRouter from './routes/auth.js'
import herbsRouter from './routes/herbs.js'
import verifyRouter from './routes/verify.js'
import chatRouter from './routes/chat.js'
import ordersRouter, { razorpayWebhookHandler } from './routes/orders.js'
import predictRouter from './routes/predict.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Auth routes will fail until you configure it.')
}

const devOrigins = [5173, 5174, 5175, 5176, 5177].flatMap((port) => [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
])

app.disable('x-powered-by')
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
)
app.use(securityHeaders)
app.use(rejectXmlPayloads)

app.use(
  cors({
    origin: [CLIENT_ORIGIN, ...devOrigins],
    credentials: true,
  })
)

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please wait and try again.' },
})
const payLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment attempts. Please wait and try again.' },
})

app.use(globalLimiter)

// Webhook needs raw body for HMAC — register BEFORE json parser
app.post(
  '/api/orders/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  razorpayWebhookHandler
)

app.use(express.json({ limit: '2mb', strict: true }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(sanitizeBody)

app.use('/uploads', express.static(UPLOADS_DIR))

function getHealthPayload() {
  const dbConnected = mongoose.connection.readyState === 1
  const storageMode = getStorageMode()
  const ready = isStorageReady()
  const payments = getPublicPaymentConfig()
  return {
    ok: ready,
    service: 'ayurauth-api',
    storageMode,
    dbConnected,
    imageStorage: getImageStorageMode(),
    llm: Boolean(process.env.ANTHROPIC_API_KEY),
    flask: process.env.FLASK_API_URL || 'http://127.0.0.1:5001',
    demoEmail: process.env.SEED_DEMO_EMAIL || 'farmer@ayurauth.demo',
    payments: {
      provider: payments.provider,
      demo: payments.demo,
    },
    security: {
      xmlParsing: false,
      helmet: true,
      rateLimit: true,
    },
  }
}

/** Human-readable status (avoids blank JSON viewer in some browsers) */
app.get('/', (_req, res) => {
  const h = getHealthPayload()
  const status = h.ok ? 'OK' : 'NOT READY'
  res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AyurAuth API</title></head>
<body style="font-family:system-ui;max-width:40rem;margin:2rem auto;padding:0 1rem">
  <h1>AyurAuth API — ${status}</h1>
  <ul>
    <li><strong>Storage:</strong> ${h.storageMode}</li>
    <li><strong>MongoDB connected:</strong> ${h.dbConnected}</li>
    <li><strong>Ready for login:</strong> ${h.ok}</li>
    <li><strong>Payments:</strong> ${h.payments.provider}</li>
    <li><strong>XML body parsing:</strong> disabled (injection-safe)</li>
  </ul>
  <p>JSON: <a href="/api/health">/api/health</a></p>
  <p>Demo login: <code>${h.demoEmail}</code> (password in <code>backend/.env</code> → <code>SEED_DEMO_PASSWORD</code>)</p>
</body></html>`)
})

app.get('/api/health', (req, res) => {
  const payload = getHealthPayload()
  if (req.accepts(['html', 'json']) === 'html') {
    const status = payload.ok ? 'OK' : 'NOT READY'
    return res.type('html').send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>API Health</title></head>
<body style="font-family:monospace;padding:1.5rem">
<pre>Status: ${status}
storageMode: ${payload.storageMode}
dbConnected: ${payload.dbConnected}
ok: ${payload.ok}
payments: ${payload.payments.provider}
xmlParsing: false
demoEmail: ${payload.demoEmail}</pre>
<p><a href="/">Home</a></p>
</body></html>`)
  }
  res.json(payload)
})

app.use('/api/auth', authLimiter, requireDb, authRouter)
app.use('/api/herbs', requireDb, herbsRouter)
app.use('/api/verify', requireDb, verifyRouter)
app.use('/api/chat', requireDb, chatRouter)
app.use('/api/predict', requireDb, predictRouter)
app.use('/api/orders', payLimiter, requireDb, ordersRouter)

app.use((err, _req, res, _next) => {
  console.error(err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
})

async function start() {
  await ensureUploadsDir()

  const server = app.listen(PORT, () => {
    console.log(`AyurAuth API listening on http://localhost:${PORT}`)
    console.log(`Health check: http://localhost:${PORT}/api/health`)
    console.log(`Static uploads: http://localhost:${PORT}/uploads/`)
    console.log(`Payments: ${getPublicPaymentConfig().provider}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\nPort ${PORT} is already in use. Another backend is probably still running.\n` +
          `Fix (PowerShell): Get-NetTCPConnection -LocalPort ${PORT} | Select OwningProcess\n` +
          `Then: taskkill /PID <pid> /F\n` +
          `Or change PORT in backend/.env\n`
      )
      process.exit(1)
    }
    throw err
  })

  try {
    const mode = await initStorage()
    console.log(`Storage ready: ${mode}`)
  } catch (err) {
    console.error('Storage init failed:', err.message)
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err.message)
  process.exit(1)
})
