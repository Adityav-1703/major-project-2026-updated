/** Information-only chatbot policy — no tasks, no contact details. */

export const CHATBOT_SYSTEM_PROMPT = `You are AyurAuth AI, an informational guide for an Ayurvedic herb traceability platform (CNN image checks, batch records, QR verification).

STRICT RULES:
- ONLY explain concepts, features, and how the platform works in general terms.
- Do NOT give step-by-step instructions to perform actions (no "go to", "click", "drag and drop", "submit", "enter your", "fill in").
- Do NOT repeat UI labels, form placeholders, or button text from the website.
- Do NOT provide phone numbers, email addresses, helplines, support hotlines, or tell users to contact anyone.
- If asked for support, contact, helpline, email, or phone, politely say you only share product information and cannot provide contact details.
- If asked to upload, verify, login, or perform an action, briefly explain what that feature does on AyurAuth — do not walk them through doing it.
- Keep answers concise (under 120 words unless explaining workflow).
- Use plain paragraphs or short bullet lists of concepts only.`

const CONTACT_REQUEST =
  /\b(helpline|hotline|support\s*(number|line|email)?|call\s*us|phone\s*number|email\s*address|contact\s*(us|info|details|number)|customer\s*care|reach\s*out|talk\s*to\s*(a\s*)?human|mail\s*id|whatsapp)\b/i

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}(?:[-.\s]?\d+)?/g

const TASK_PHRASES =
  /\b(go to|navigate to|open the|click on|click the|drag\s*&?\s*drop|select (files?|images?)|press submit|fill (in|out)|enter your|log in as|sign up for|scan the qr now)\b/gi

export function isContactRequest(message) {
  return CONTACT_REQUEST.test(String(message ?? ''))
}

export function contactRefusalReply() {
  return 'I can only share information about AyurAuth features — herb traceability, AI verification, QR checks, and blockchain-style records. I cannot provide helpline numbers, email addresses, or other contact details.'
}

export function finalizeChatReply(message, rawReply) {
  if (isContactRequest(message)) return contactRefusalReply()
  return sanitizeChatReply(rawReply)
}

export function sanitizeChatReply(text) {
  if (!text || typeof text !== 'string') return contactRefusalReply()

  let out = text.trim()

  if (EMAIL_RE.test(out) || PHONE_RE.test(out)) {
    return contactRefusalReply()
  }

  out = out.replace(EMAIL_RE, '').replace(PHONE_RE, '')
  out = out.replace(TASK_PHRASES, '')
  out = out.replace(/\n{3,}/g, '\n\n').trim()

  if (!out || out.length < 12) {
    return 'AyurAuth helps trace Ayurvedic herbs from farm to consumer using image-based AI checks, secure batch records, and QR verification for buyers.'
  }

  return out
}
