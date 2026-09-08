/** Topic detection for rule-based AyurAuth chat (information-only). */

export const TOPIC_REPLIES = {
  workflow: `AyurAuth is a shopper-first (B2C) authenticity app.

1. Buy a pack that carries an AyurAuth QR.
2. Open **Scan pack** and scan (or paste the batch ID).
3. Read the **AI class and confidence** (Amla, Guava, Hibiscus, Neem, Tulsi).
4. Check **origin** and verified status.
5. Signed-in shoppers save results under **My checks**.

Growers can list batches, but the product is designed around your purchase decision.`,

  upload: `Growers **list a batch** with a photo and farm location. Shoppers do not need this — use **Shop verified herbs** and **Scan pack**.`,

  ai: `**AI authenticity** uses a CNN (MobileNetV2) on the leaf photo. You see a predicted class and a 0–1 confidence score. Above the threshold the pack is marked verified. This supports buying decisions; it does not replace lab testing.`,

  verify: `**Scan a pack** to confirm what you bought. Valid = registered and AI-verified. Unverified = registered but below the AI threshold. Invalid = no matching batch (possible fake or unregistered code).`,

  blockchain: `Each listing has a tamper-evident hash. When you scan, you can check that origin and AI results were not silently rewritten. There is no crypto wallet or token.`,

  hello: `Hello! I'm the AyurAuth shopper assistant. Ask how to scan a pack, read AI scores, or browse verified listings.`,

  thanks: `You're welcome. Ask about scanning a pack, AI authenticity, or verified listings anytime.`,

  default: `I can explain:

- How to **scan a pack** you bought
- **AI authenticity** scores
- **Shop verified herbs**
- **My checks** history
- How growers list a batch

Try "How do I scan a pack I bought?"`,
}

function scoreWorkflow(lower) {
  let s = 0
  if (/\b(workflow|process|pipeline|end.to.end|how does ayurauth work|stages?|steps?)\b/.test(lower)) s += 4
  if (/\b(traceability|supply chain|farm to consumer)\b/.test(lower)) s += 2
  return s
}

function scoreUpload(lower) {
  let s = 0
  if (/\bupload\b/.test(lower)) s += 2
  if (/\b(what is|explain|about|tell me|how).{0,30}\bupload\b/.test(lower)) s += 3
  if (/\bupload\b.{0,25}\b(work|feature|process|function)\b/.test(lower)) s += 3
  if (/\bregister\b.{0,20}\b(batch|herb)\b/.test(lower)) s += 2
  return s
}

function scoreAi(lower) {
  let s = 0
  if (/\bai\b/.test(lower)) s += 2
  if (/\b(cnn|neural|mobilenet|machine learning|deep learning|convolutional)\b/.test(lower)) s += 3
  if (/\bimage\b/.test(lower) && /\b(verif|authentic|check|scan|detect|classif|model)\b/.test(lower)) s += 5
  if (/\bai\b.{0,30}\b(verif|authentic|image|photo|model|cnn)\b/.test(lower)) s += 4
  if (/\b(verif|authentic)\b.{0,30}\b(image|photo|leaf|herb)\b/.test(lower)) s += 4
  if (/\b(confidence|prediction|predicted class|threshold)\b/.test(lower)) s += 2
  if (lower.includes('ai image')) s += 4
  return s
}

function scoreVerify(lower) {
  let s = 0
  if (/\b(qr|qrcode|qr code|scan)\b/.test(lower)) s += 3
  if (/\bconsumer\b/.test(lower)) s += 2
  if (/\b(what is|explain|about|how).{0,30}\b(verif|authentic)\b/.test(lower)) s += 3
  if (/\b(verif|authentic)\b.{0,25}\b(work|consumer|qr|scan)\b/.test(lower)) s += 3
  if (/\b(shop|browse|listing|pack I bought|my checks)\b/.test(lower)) s += 3
  return s
}

function scoreBlockchain(lower) {
  let s = 0
  if (/\b(blockchain|on.chain|immutable|cryptographic|hash)\b/.test(lower)) s += 4
  if (/\btamper/.test(lower)) s += 2
  return s
}

/**
 * @returns {{ id: string, score: number, reply: string }}
 */
export function matchChatTopic(message) {
  const lower = String(message ?? '').toLowerCase().trim()
  if (!lower) return { id: 'default', score: 0, reply: TOPIC_REPLIES.default }

  if (/\b(hi|hello|hey|namaste|good morning|good evening)\b/.test(lower) && lower.length < 40) {
    return { id: 'hello', score: 10, reply: TOPIC_REPLIES.hello }
  }
  if (/\bthank/.test(lower)) return { id: 'thanks', score: 10, reply: TOPIC_REPLIES.thanks }

  const candidates = [
    { id: 'ai', score: scoreAi(lower), reply: TOPIC_REPLIES.ai },
    { id: 'workflow', score: scoreWorkflow(lower), reply: TOPIC_REPLIES.workflow },
    { id: 'upload', score: scoreUpload(lower), reply: TOPIC_REPLIES.upload },
    { id: 'verify', score: scoreVerify(lower), reply: TOPIC_REPLIES.verify },
    { id: 'blockchain', score: scoreBlockchain(lower), reply: TOPIC_REPLIES.blockchain },
  ]

  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]
  if (best.score >= 2) return best

  return { id: 'default', score: 0, reply: TOPIC_REPLIES.default }
}

export const DEFAULT_TOPIC_REPLY = TOPIC_REPLIES.default
