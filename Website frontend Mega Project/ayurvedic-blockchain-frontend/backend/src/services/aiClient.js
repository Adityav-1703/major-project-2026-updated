const FLASK_URL = process.env.FLASK_API_URL || 'http://127.0.0.1:5001'
const VERIFY_THRESHOLD = Number(process.env.AI_VERIFY_THRESHOLD || 0.7)

/**
 * Call Python Flask CNN service. Returns normalized prediction for herb upload.
 */
export async function predictHerbImage(buffer) {
  const image = buffer.toString('base64')
  let response
  try {
    response = await fetch(`${FLASK_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
      signal: AbortSignal.timeout(Number(process.env.FLASK_TIMEOUT_MS || 30_000)),
    })
  } catch (err) {
    throw new Error(
      `AI verification service unavailable. Start ml-service: cd ml-service && python app.py (${err.message})`
    )
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'AI prediction failed')
  }

  const confidence = Number(data.confidence ?? 0)
  const isAuthentic =
    typeof data.isAuthentic === 'boolean'
      ? data.isAuthentic
      : confidence >= VERIFY_THRESHOLD

  return {
    isAuthentic,
    confidence,
    modelName: data.modelName || data.model || 'leaf_model.h5',
    predictedClass: data.class || data.predictedClass || 'unknown',
  }
}
