import { useState, useCallback } from 'react'
import { verifyQrCode, type VerifyResult } from '@/lib/api'
import type { HerbRecord } from '@/types/herb'

export function useVerify() {
  const [record, setRecord] = useState<HerbRecord | null>(null)
  const [verifyStatus, setVerifyStatus] = useState<VerifyResult['status'] | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const reset = useCallback(() => {
    setRecord(null)
    setVerifyStatus(null)
    setMessage('')
  }, [])

  const verify = useCallback(async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) {
      setMessage('Enter a QR code or batch ID.')
      setVerifyStatus(null)
      setRecord(null)
      return null
    }

    setIsLoading(true)
    setRecord(null)
    setVerifyStatus(null)
    setMessage('')

    try {
      const result = await verifyQrCode(trimmed)
      setVerifyStatus(result.status)
      setMessage(result.message)
      setRecord(result.record)
      return result
    } catch {
      setMessage(
        'Unable to reach verification server. Start the API with: cd backend && npm run dev'
      )
      setVerifyStatus(null)
      setRecord(null)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { record, verifyStatus, message, isLoading, verify, reset }
}
