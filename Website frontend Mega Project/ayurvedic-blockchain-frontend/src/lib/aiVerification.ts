export interface AIValidationResult {
  isAuthentic: boolean
  confidence: number
  modelName: string
}

function scoreFromFile(file: File): number {
  const seed = `${file.name}-${file.size}-${file.lastModified}`
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index)
    hash |= 0
  }
  const normalized = Math.abs(hash % 1000) / 1000
  return 0.5 + normalized * 0.5
}

/**
 * Dummy CNN verification for local UI integration.
 * Replace this function with a real backend model endpoint when ready.
 */
export async function runHerbCNNVerification(file: File): Promise<AIValidationResult> {
  await new Promise((resolve) => setTimeout(resolve, 1400))
  const confidence = Number(scoreFromFile(file).toFixed(3))
  return {
    isAuthentic: confidence >= 0.7,
    confidence,
    modelName: 'CNN-HerbNet-v0-dummy',
  }
}
