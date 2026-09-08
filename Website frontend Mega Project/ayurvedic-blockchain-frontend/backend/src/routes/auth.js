import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { signToken, requireAuth } from '../middleware/auth.js'
import {
  createUser,
  findUserByEmail,
  findUserById,
  serializeUser,
} from '../services/repository.js'
import { validateBody, registerSchema, loginSchema } from '../validation/schemas.js'

const router = Router()
const SALT_ROUNDS = 12

router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.validated
    const existing = await findUserByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await createUser({ name, email, passwordHash, role })
    const token = signToken(user)

    res.status(201).json({ token, user: serializeUser(user) })
  } catch (err) {
    next(err)
  }
})

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validated
    const user = await findUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signToken(user)
    res.json({ token, user: serializeUser(user) })
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.sub)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user: serializeUser(user) })
  } catch (err) {
    next(err)
  }
})

export default router
