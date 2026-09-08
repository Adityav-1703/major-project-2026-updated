/** Client-side informational chatbot (fallback when API is unavailable). */

const CONTACT_REQUEST =
  /\b(helpline|hotline|support\s*(number|line|email)?|call\s*us|phone\s*number|email\s*address|contact\s*(us|info|details|number)|customer\s*care|reach\s*out|talk\s*to\s*(a\s*)?human|mail\s*id|whatsapp)\b/i

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}(?:[-.\s]?\d+)?/g

const TASK_PHRASES =
  /\b(go to|navigate to|open the|click on|click the|drag\s*&?\s*drop|select (files?|images?)|press submit|fill (in|out)|enter your|log in as)\b/gi

export const CHATBOT_WELCOME =
  "Hello! I'm AyurAuth for shoppers. Ask how to scan a pack, read AI authenticity, or browse verified herb listings."

export const CHATBOT_CONTACT_REFUSAL =
  'I only share information about AyurAuth features. I cannot provide helpline numbers, email addresses, or other contact details.'

const REPLIES = {
  workflow: `AyurAuth is a shopper-first authenticity app:

1. **You buy a pack** — Look for the AyurAuth QR on the label.
2. **Scan** — Open Scan pack and point your camera at the QR (or paste the batch ID).
3. **AI check** — We show the CNN class (Amla, Guava, Hibiscus, Neem, or Tulsi) and a confidence score.
4. **Origin** — You see farm coordinates and whether the listing is verified.
5. **Save** — Signed-in shoppers keep a history under My checks.

Growers can still list batches, but the product is built around your purchase decision.`,

  upload: `Growers can **list a batch** with a photo and location. Shoppers do not need this screen — use Shop verified herbs and Scan pack instead.`,

  ai: `**AI image verification** analyzes herb photos with a convolutional neural network (CNN). The model returns a predicted herb class and a confidence score (0–1). Above the threshold, the batch is marked verified; otherwise it stays unverified.

This supports image-based authenticity checks — it does not replace laboratory quality testing.`,

  verify: `**Scan a pack** to confirm what you bought. A matching QR shows herb name, origin, AI confidence, and a verified / not-verified badge. No match usually means an unregistered or fake code.`,

  blockchain: `**Blockchain-style records** make supply-chain data tamper-evident. Each verified batch gets a cryptographic hash consumers can cross-check when scanning a QR.`,

  hello: CHATBOT_WELCOME,
  thanks: "You're welcome! Ask about the workflow, AI verification, or QR lookup anytime.",
  default:
    'I can explain scanning a pack, AI authenticity scores, verified listings, or grower listing. Try "How do I scan a pack?"',
}

function scoreAi(lower: string): number {
  let s = 0
  if (/\bai\b/.test(lower)) s += 2
  if (/\b(cnn|neural|mobilenet|machine learning)\b/.test(lower)) s += 3
  if (/\bimage\b/.test(lower) && /\b(verif|authentic|check|model)\b/.test(lower)) s += 5
  if (/\bai\b.{0,30}\b(verif|authentic|image|photo|model)\b/.test(lower)) s += 4
  if (lower.includes('ai image')) s += 4
  return s
}

function scoreWorkflow(lower: string): number {
  let s = 0
  if (/\b(workflow|process|how does ayurauth work|stages?|steps?)\b/.test(lower)) s += 4
  return s
}

function scoreUpload(lower: string): number {
  let s = 0
  if (/\bupload\b/.test(lower)) s += 2
  if (/\b(what is|explain|how).{0,30}\bupload\b/.test(lower)) s += 3
  return s
}

function scoreVerify(lower: string): number {
  let s = 0
  if (/\b(qr|scan)\b/.test(lower)) s += 3
  if (/\b(verif|authentic)\b/.test(lower)) s += 2
  if (/\bconsumer\b/.test(lower)) s += 2
  return s
}

function scoreBlockchain(lower: string): number {
  return /\b(blockchain|hash|on.chain|immutable)\b/.test(lower) ? 4 : 0
}

function matchTopic(message: string): string {
  const lower = message.toLowerCase().trim()
  if (!lower) return REPLIES.default
  if (/\b(hi|hello|hey|namaste)\b/.test(lower) && lower.length < 40) return REPLIES.hello
  if (/\bthank/.test(lower)) return REPLIES.thanks

  const ranked = [
    { score: scoreAi(lower), reply: REPLIES.ai },
    { score: scoreWorkflow(lower), reply: REPLIES.workflow },
    { score: scoreUpload(lower), reply: REPLIES.upload },
    { score: scoreVerify(lower), reply: REPLIES.verify },
    { score: scoreBlockchain(lower), reply: REPLIES.blockchain },
  ].sort((a, b) => b.score - a.score)

  if (ranked[0].score >= 2) return ranked[0].reply
  return REPLIES.default
}

export function isContactRequest(message: string): boolean {
  return CONTACT_REQUEST.test(message)
}

export function sanitizeChatReply(text: string): string {
  const trimmed = text.trim()
  if (EMAIL_RE.test(trimmed) || PHONE_RE.test(trimmed)) return CHATBOT_CONTACT_REFUSAL

  let out = trimmed.replace(EMAIL_RE, '').replace(PHONE_RE, '').replace(TASK_PHRASES, '')
  out = out.replace(/\n{3,}/g, '\n\n').trim()

  if (!out || out.length < 12) {
    return REPLIES.ai
  }
  return out
}

export function getLocalChatReply(message: string): string {
  if (isContactRequest(message)) return CHATBOT_CONTACT_REFUSAL
  return matchTopic(message)
}

export function finalizeChatReply(message: string, rawReply: string): string {
  if (isContactRequest(message)) return CHATBOT_CONTACT_REFUSAL
  return sanitizeChatReply(rawReply)
}

export type ChatHistoryItem = { role: 'user' | 'assistant'; content: string }

export function buildChatHistory(
  messages: { role: 'user' | 'assistant'; content: string }[],
  max = 8
): ChatHistoryItem[] {
  return messages.slice(-max).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 2000),
  }))
}
