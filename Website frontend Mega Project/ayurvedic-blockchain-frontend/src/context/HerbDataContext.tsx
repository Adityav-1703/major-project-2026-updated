import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { HerbRecord } from '@/types/herb'
import { fetchHerbRecords, uploadHerbBatch } from '@/lib/api'

export interface UploadHerbInput {
  herbName: string
  farmerId: string
  latitude: number
  longitude: number
  image: File
}

interface HerbDataContextValue {
  records: HerbRecord[]
  isLoading: boolean
  apiConnected: boolean
  uploadHerb: (input: UploadHerbInput) => Promise<{
    record: HerbRecord
    qrPayload: string
    qrImage: string
  }>
  getRecordById: (id: string) => HerbRecord | undefined
  refreshRecords: () => Promise<void>
}

const HerbDataContext = createContext<HerbDataContextValue | undefined>(undefined)

export function HerbDataProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<HerbRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [apiConnected, setApiConnected] = useState(false)

  const refreshRecords = useCallback(async () => {
    try {
      const remote = await fetchHerbRecords()
      setRecords(remote)
      setApiConnected(true)
    } catch {
      setApiConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshRecords()
  }, [refreshRecords])

  const value = useMemo<HerbDataContextValue>(() => {
    return {
      records,
      isLoading,
      apiConnected,
      refreshRecords,
      uploadHerb: async (input) => {
        const formData = new FormData()
        formData.append('image', input.image)
        formData.append('herbName', input.herbName.trim())
        formData.append('farmerId', input.farmerId.trim())
        formData.append('latitude', String(input.latitude))
        formData.append('longitude', String(input.longitude))

        const result = await uploadHerbBatch(formData)
        const updated = [result.record, ...records.filter((r) => r.id !== result.record.id)]
        setRecords(updated)
        setApiConnected(true)
        return result
      },
      getRecordById: (id) => {
        const trimmed = id.trim()
        return records.find(
          (record) =>
            record.id === trimmed ||
            record.farmerId === trimmed ||
            record.qrPayload === trimmed
        )
      },
    }
  }, [records, isLoading, apiConnected, refreshRecords])

  return <HerbDataContext.Provider value={value}>{children}</HerbDataContext.Provider>
}

export function useHerbData() {
  const context = useContext(HerbDataContext)
  if (!context) {
    throw new Error('useHerbData must be used inside HerbDataProvider')
  }
  return context
}
