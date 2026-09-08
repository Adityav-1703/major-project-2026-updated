import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validateBody, createPaymentSchema, confirmPaymentSchema, checkoutSchema } from '../validation/schemas.js'
import { findHerbByBatchId, listOrdersForUser } from '../services/repository.js'
import {
  confirmPayment,
  createPaymentIntent,
  getPublicPaymentConfig,
  verifyWebhookSignature,
} from '../services/payments.js'

const router = Router()

router.get('/config', (_req, res) => {
  res.json(getPublicPaymentConfig())
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const orders = await listOrdersForUser(req.user.sub)
    res.json({ orders })
  } catch (err) {
    next(err)
  }
})

/** Create Razorpay (or signed demo) payment intent — never marks sold yet. */
router.post('/create-payment', requireAuth, validateBody(createPaymentSchema), async (req, res, next) => {
  try {
    const { batchId } = req.validated
    const result = await createPaymentIntent({
      batchId,
      buyerId: req.user.sub,
      buyerEmail: req.user.email,
    })
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error })
    }
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
})

/** Verify signature / demo token then finalize ownership. */
router.post('/confirm-payment', requireAuth, validateBody(confirmPaymentSchema), async (req, res, next) => {
  try {
    const { orderId, paymentId, signature, demoToken } = req.validated
    const result = await confirmPayment({
      orderId,
      paymentId,
      signature,
      demoToken,
      buyerId: req.user.sub,
      buyerEmail: req.user.email,
    })
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error })
    }
    res.status(201).json({
      order: result.order,
      record: result.record,
      message: 'Payment verified. This unique batch is now yours.',
    })
  } catch (err) {
    next(err)
  }
})

/**
 * Legacy demo checkout kept for backwards compatibility.
 * Prefer create-payment + confirm-payment.
 */
router.post('/checkout', requireAuth, validateBody(checkoutSchema), async (req, res, next) => {
  try {
    const { batchId, method } = req.validated
    const existing = await findHerbByBatchId(batchId)
    if (!existing) {
      return res.status(404).json({ error: 'Batch not found' })
    }

    const { getPublicPaymentConfig } = await import('../services/payments.js')
    const cfg = getPublicPaymentConfig()
    if (cfg.provider === 'razorpay') {
      return res.status(400).json({
        error: 'Use /api/orders/create-payment then /confirm-payment for Razorpay checkout',
      })
    }

    const intentResult = await createPaymentIntent({
      batchId,
      buyerId: req.user.sub,
      buyerEmail: req.user.email,
    })
    if (intentResult.error) {
      return res.status(intentResult.status || 400).json({ error: intentResult.error })
    }
    const confirmed = await confirmPayment({
      orderId: intentResult.intent.orderId,
      demoToken: intentResult.intent.demoToken,
      buyerId: req.user.sub,
      buyerEmail: req.user.email,
    })
    if (confirmed.error) {
      return res.status(confirmed.status || 400).json({ error: confirmed.error })
    }
    return res.status(201).json({
      order: confirmed.order,
      record: confirmed.record,
      demo: true,
      method,
      message: 'Payment succeeded. This unique batch is now yours.',
    })
  } catch (err) {
    next(err)
  }
})

/** Razorpay webhook — raw body verified via HMAC. Mounted with express.raw in index. */
export async function razorpayWebhookHandler(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature']
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}))
    if (!verifyWebhookSignature(raw, signature)) {
      return res.status(400).json({ error: 'Invalid webhook signature' })
    }
    const event = JSON.parse(raw.toString('utf8'))
    // Acknowledge; ownership is finalized via confirm-payment after Checkout success
    console.log('Razorpay webhook:', event.event)
    res.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err.message)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}

export default router
