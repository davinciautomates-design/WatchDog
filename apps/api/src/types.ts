import type { Category, SourceType } from '@watchdog/types'

/** Internal shape used by data source workers before writing to the DB. */
export interface CanonicalEvent {
  sourceId: string
  sourceType: SourceType
  category: Category
  title: string
  description: string
  lat: number
  lng: number
  confidence: number
  startedAt: Date
  expiresAt: Date | null
  rawPayload: Record<string, unknown>
  metadata: Record<string, unknown>
}
