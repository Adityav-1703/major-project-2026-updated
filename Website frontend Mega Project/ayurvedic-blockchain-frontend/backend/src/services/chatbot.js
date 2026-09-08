import { Herb } from '../models/Herb.js'
import { CHATBOT_SYSTEM_PROMPT, finalizeChatReply, isContactRequest, contactRefusalReply } from './chatbotPolicy.js'
import { DEFAULT_TOPIC_REPLY, getRuleBasedReply } from './chatbotRules.js'

async function fetchHerbContext() {
  const herbs = await Herb.find()
    .sort({ timestamp: -1 })
    .limit(8)
    .select('herbName farmerId isVerified aiConfidence origin timestamp')
    .lean()
  return herbs.map((h) => ({
    herb: h.herbName,
    farmer: h.farmerId,
    verified: h.isVerified,
    confidence: h.aiConfidence,
    origin: h.origin,
    date: h.timestamp,
  }))
}

async function getAnthropicReply(message, herbContext, history = []) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null

  if (isContactRequest(message)) return contactRefusalReply()

  const system = `${CHATBOT_SYSTEM_PROMPT}

Recent herb batches in the database (context only — describe trends, do not instruct users to act):
${JSON.stringify(herbContext, null, 2)}`

  const prior = history
    .filter((m) => m?.role === 'user' || m?.role === 'assistant')
    .slice(-8)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
      max_tokens: 600,
      system,
      messages: [...prior, { role: 'user', content: message }],
    }),
    signal: AbortSignal.timeout(Number(process.env.ANTHROPIC_TIMEOUT_MS || 60_000)),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    console.warn('Anthropic API error:', data.error?.message || response.status)
    return null
  }

  const text = data.content?.find((block) => block.type === 'text')?.text
  return text?.trim() || null
}

export async function getChatReply(message, history = []) {
  if (isContactRequest(message)) {
    return finalizeChatReply(message, contactRefusalReply())
  }

  const ruleReply = getRuleBasedReply(message)
  const herbContext = await fetchHerbContext().catch(() => [])

  try {
    const llmReply = await getAnthropicReply(message, herbContext, history)
    if (llmReply) {
      const trimmed = llmReply.trim()
      const isGeneric =
        trimmed === DEFAULT_TOPIC_REPLY ||
        trimmed.includes('What would you like to know?')
      if (!isGeneric || ruleReply === DEFAULT_TOPIC_REPLY) {
        return finalizeChatReply(message, llmReply)
      }
    }
  } catch (err) {
    console.warn('LLM chat fallback:', err.message)
  }

  return finalizeChatReply(message, ruleReply)
}
