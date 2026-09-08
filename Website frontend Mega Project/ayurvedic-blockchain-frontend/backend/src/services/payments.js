import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import { findHerbByBatchId, checkoutHerb, serializeHerb } from './repository.js'

let razorpayClient = null

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

function getClient() {
  if (!isRazorpayConfigured()) return null
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return razorpayClient
}

export function getPublicPaymentConfig() {
  return {
    provider: isRazorpayConfigured() ? 'razorpay' : 'secure_demo',
    keyId: isRazorpayConfigured() ? process.env.RAZORPAY_KEY_ID : null,
    currency: 'INR',
    demo: !isRazorpayConfigured(),
  }
}

/** In-memory pending payment intents (also fine for local JSON mode demos). */
const pendingIntents = new Map()

export function getPendingIntent(orderId) {
  return pendingIntents.get(orderId) || null
}

export function clearPendingIntent(orderId) {
  pendingIntents.delete(orderId)
}

/**
 * Create a payment intent. Uses Razorpay when keys exist;
 * otherwise creates a server-signed demo intent (never trusts the client alone).
 */
export async function createPaymentIntent({ batchId, buyerId, buyerEmail }) {
  const herb = await findHerbByBatchId(batchId)
  if (!herb) return { error: 'Batch not found', status: 404 }
  if (herb.sold) return { error: 'This unique batch is already sold', status: 409 }

  const amountInr = Number(herb.priceInr) || 0
  if (amountInr <= 0) return { error: 'Invalid price for batch', status: 400 }

  const amountPaise = Math.round(amountInr * 100)
  const receipt = `ayur_${herb.batchId}_${Date.now()}`.slice(0, 40)

  const client = getClient()
  if (client) {
    const rzOrder = await client.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        batchId: herb.batchId,
        buyerId: String(buyerId),
        buyerEmail: String(buyerEmail || ''),
        herbName: herb.herbName,
      },
    })

    pendingIntents.set(rzOrder.id, {
      batchId: herb.batchId,
      buyerId,
      buyerEmail,
      amount: amountInr,
      amountPaise,
      provider: 'razorpay',
      createdAt: Date.now(),
    })

    return {
      intent: {
        orderId: rzOrder.id,
        amount: amountInr,
        amountPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        provider: 'razorpay',
        herbName: herb.herbName,
        batchId: herb.batchId,
      },
      record: serializeHerb(herb),
    }
  }

  // Secure demo: HMAC-signed intent — client must return signature to complete
  const demoOrderId = `demo_${crypto.randomBytes(12).toString('hex')}`
  const secret = process.env.JWT_SECRET || 'dev-only-change-me'
  const payload = `${demoOrderId}|${amountPaise}|${herb.batchId}|${buyerId}`
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

  pendingIntents.set(demoOrderId, {
    batchId: herb.batchId,
    buyerId,
    buyerEmail,
    amount: amountInr,
    amountPaise,
    provider: 'secure_demo',
    signature,
    createdAt: Date.now(),
  })

  return {
    intent: {
      orderId: demoOrderId,
      amount: amountInr,
      amountPaise,
      currency: 'INR',
      keyId: null,
      provider: 'secure_demo',
      herbName: herb.herbName,
      batchId: herb.batchId,
      demoToken: signature,
    },
    record: serializeHerb(herb),
  }
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret) return false
  const body = `${orderId}|${paymentId}`
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))
  } catch {
    return false
  }
}

export function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)))
  } catch {
    return false
  }
}

/**
 * Finalize payment after client-side Razorpay checkout or signed demo token.
 */
export async function confirmPayment({
  orderId,
  paymentId,
  signature,
  demoToken,
  buyerId,
  buyerEmail,
}) {
  const intent = pendingIntents.get(orderId)
  if (!intent) {
    return { error: 'Unknown or expired payment intent', status: 400 }
  }
  if (String(intent.buyerId) !== String(buyerId)) {
    return { error: 'Payment intent does not belong to this user', status: 403 }
  }

  // Expire after 30 minutes
  if (Date.now() - intent.createdAt > 30 * 60 * 1000) {
    pendingIntents.delete(orderId)
    return { error: 'Payment intent expired', status: 400 }
  }

  if (intent.provider === 'razorpay') {
    if (!verifyRazorpaySignature({ orderId, paymentId, signature })) {
      return { error: 'Invalid payment signature', status: 400 }
    }
  } else {
    if (!demoToken || demoToken !== intent.signature) {
      return { error: 'Invalid demo payment token', status: 400 }
    }
  }

  const result = await checkoutHerb({
    batchId: intent.batchId,
    buyerId,
    buyerEmail,
    method: intent.provider === 'razorpay' ? 'razorpay' : 'secure_demo',
    paymentId: paymentId || null,
    providerOrderId: orderId,
  })

  pendingIntents.delete(orderId)

  if (result.error) return result

  return {
    order: {
      ...result.order,
      paymentId: paymentId || null,
      provider: intent.provider,
    },
    record: serializeHerb(result.herb),
  }
}
