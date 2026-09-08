import { z } from 'zod'

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .refine((val) => val.includes('@'), 'Email must contain an @ symbol')
  .refine(
    (val) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val),
    'Enter a valid email (e.g. name@example.com)'
  )

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must include at least one symbol')
  .regex(
    /^[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/,
    'Password can only contain letters, numbers, and symbols'
  )

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['farmer', 'consumer']).optional().default('consumer'),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export const createHerbBodySchema = z.object({
  herbName: z.string().trim().min(1, 'Herb name is required'),
  farmerId: z.string().trim().min(1, 'Farmer ID is required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})

export const checkoutSchema = z.object({
  batchId: z.string().trim().min(1, 'Batch ID is required'),
  method: z.enum(['upi', 'card', 'demo', 'razorpay']).optional().default('demo'),
})

export const createPaymentSchema = z.object({
  batchId: z.string().trim().min(1, 'Batch ID is required').max(128),
})

export const confirmPaymentSchema = z.object({
  orderId: z.string().trim().min(1).max(128),
  paymentId: z.string().trim().max(128).optional(),
  signature: z.string().trim().max(256).optional(),
  demoToken: z.string().trim().max(256).optional(),
})

export const verifySchema = z.object({
  code: z.string().trim().min(1, 'QR code or batch ID is required'),
})

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      })
    )
    .max(16)
    .optional(),
})

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join('; ')
      return res.status(400).json({ error: message, details: parsed.error.flatten() })
    }
    req.validated = parsed.data
    next()
  }
}
