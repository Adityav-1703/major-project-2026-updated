import type { HerbRecord } from '@/types/herb'

const API_BASE = import.meta.env.VITE_API_URL || ''
export const TOKEN_KEY = 'ayurauth-token'
export const USER_KEY = 'ayurauth-user'

export type VerifyStatus = 'valid' | 'invalid' | 'unverified' | 'malformed'

export interface VerifyResult {
  status: VerifyStatus
  message: string
  record: HerbRecord | null
  cnn?: {
    isAuthentic: boolean
    confidence: number
    predictedClass: string
    classOk?: boolean
    cnnOk?: boolean
  } | null
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role?: string
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getAuthHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  const token = getStoredToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData
  const hasJsonBody = Boolean(options?.body && !isFormData)
  const url = `${API_BASE}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers: { ...getAuthHeaders(hasJsonBody), ...options?.headers },
    })
  } catch {
    throw new Error(
      `Cannot reach the API at ${API_BASE || 'localhost:5000'}. Start the backend: npm run backend`
    )
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data as { error?: string }).error
    if (res.status === 401) {
      throw new Error(msg || 'Invalid email or password.')
    }
    if (res.status === 503) {
      throw new Error(
        msg || 'Database not ready. Restart the backend (npm run backend) and wait for "Storage ready".'
      )
    }
    throw new Error(msg || `Request failed (${res.status})`)
  }
  return data as T
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: 'farmer' | 'consumer' = 'consumer'
): Promise<{ token: string; user: AuthUser }> {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  })
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function fetchMe(): Promise<{ user: AuthUser }> {
  return request('/api/auth/me')
}

export async function fetchHerbRecords(): Promise<HerbRecord[]> {
  const { records } = await request<{ records: HerbRecord[] }>('/api/herbs')
  return records
}

export async function uploadHerbBatch(formData: FormData): Promise<{
  record: HerbRecord
  qrPayload: string
  qrImage: string
  prediction: { isAuthentic: boolean; confidence: number; modelName: string; predictedClass: string }
}> {
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/api/herbs`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`)
  }
  return data as {
    record: HerbRecord
    qrPayload: string
    qrImage: string
    prediction: { isAuthentic: boolean; confidence: number; modelName: string; predictedClass: string }
  }
}

export async function predictHerbImage(file: File): Promise<{
  isAuthentic: boolean
  confidence: number
  modelName: string
  predictedClass: string
}> {
  const formData = new FormData()
  formData.append('image', file)
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/api/predict`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Prediction failed (${res.status})`)
  }
  return data as {
    isAuthentic: boolean
    confidence: number
    modelName: string
    predictedClass: string
  }
}

export async function verifyQrCode(code: string): Promise<VerifyResult> {
  return request<VerifyResult>('/api/verify', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

export async function fetchHerbById(id: string): Promise<HerbRecord> {
  const { record } = await request<{ record: HerbRecord }>(`/api/herbs/${id}`)
  return record
}

export async function fetchHerbQrImage(id: string): Promise<{ qrPayload: string; qrImage: string }> {
  return request(`/api/herbs/${id}/qr-image`)
}

export async function checkoutBatch(
  batchId: string,
  method: 'upi' | 'card' | 'demo' = 'demo'
): Promise<{ order: OrderRecord; record: HerbRecord; message: string }> {
  return request('/api/orders/checkout', {
    method: 'POST',
    body: JSON.stringify({ batchId, method }),
  })
}

export interface PaymentConfig {
  provider: 'razorpay' | 'secure_demo'
  keyId: string | null
  currency: string
  demo: boolean
}

export interface PaymentIntent {
  orderId: string
  amount: number
  amountPaise: number
  currency: string
  keyId: string | null
  provider: 'razorpay' | 'secure_demo'
  herbName: string
  batchId: string
  demoToken?: string
}

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  return request('/api/orders/config')
}

export async function createPayment(batchId: string): Promise<{
  intent: PaymentIntent
  record: HerbRecord
}> {
  return request('/api/orders/create-payment', {
    method: 'POST',
    body: JSON.stringify({ batchId }),
  })
}

export async function confirmPayment(payload: {
  orderId: string
  paymentId?: string
  signature?: string
  demoToken?: string
}): Promise<{ order: OrderRecord; record: HerbRecord; message: string }> {
  return request('/api/orders/confirm-payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchMyOrders(): Promise<OrderRecord[]> {
  const { orders } = await request<{ orders: OrderRecord[] }>('/api/orders')
  return orders
}

export interface OrderRecord {
  orderId: string
  batchId: string
  herbName: string
  buyerId?: string
  buyerEmail?: string
  amount: number
  method?: string
  paidAt: string
  qrPayload: string
  status: string
  paymentId?: string | null
  provider?: string
}

export async function verifyPackComplete(code: string, leafFile?: File | null): Promise<VerifyResult> {
  const form = new FormData()
  form.append('code', code)
  if (leafFile) form.append('image', leafFile)
  const token = getStoredToken()
  const res = await fetch(`${API_BASE}/api/verify/complete`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Verify failed (${res.status})`)
  }
  return data as VerifyResult
}

export async function sendChatMessage(
  message: string,
  history?: { role: 'user' | 'assistant'; content: string }[]
): Promise<{ reply: string; source?: string }> {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history: history?.length ? history : undefined }),
  })
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const { ok } = await request<{ ok: boolean }>('/api/health')
    return Boolean(ok)
  } catch {
    return false
  }
}
