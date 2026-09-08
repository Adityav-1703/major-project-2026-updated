export interface HerbRecord {
  id: string
  herbName: string
  farmerId: string
  imageUrl: string
  origin: string
  latitude: number
  longitude: number
  timestamp: string
  isVerified: boolean
  aiConfidence: number
  aiModel: string
  blockchainHash?: string
  qrPayload?: string
  predictedClass?: string
  sold?: boolean
  soldTo?: string
  paidAt?: string
  orderId?: string
  priceInr?: number
  uniqueQr?: string
}
