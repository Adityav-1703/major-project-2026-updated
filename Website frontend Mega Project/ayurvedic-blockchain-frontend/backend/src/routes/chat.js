import { Router } from 'express'
import { optionalAuth } from '../middleware/auth.js'
import { validateBody, chatSchema } from '../validation/schemas.js'
import { getChatReply } from '../services/chatbot.js'

const router = Router()

router.post('/', optionalAuth, validateBody(chatSchema), async (req, res, next) => {
  try {
    const { message, history } = req.validated
    const reply = await getChatReply(message, history)
    res.json({ reply, source: process.env.ANTHROPIC_API_KEY ? 'llm' : 'rules' })
  } catch (err) {
    next(err)
  }
})

export default router
