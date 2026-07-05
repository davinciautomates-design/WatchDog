/**
 * Ontario 511 data source worker.
 *
 * Fetches road events (roadwork, accidents, closures) from the province-wide
 * Ontario 511 API, filters to the GTA bounding box, and upserts to the DB.
 *
 * API docs: https://511on.ca/developers/doc
 * Endpoint: https://511on.ca/api/v2/get/event?format=json&lang=en
 * Rate limit: 10 calls / 60 s
 * Suggested poll interval: every 2 minutes
 */
import { calculateConfidence, isWithinGtaBounds } from '@watchdog/utils'
import type { CanonicalEvent } from '../../types'

const ENDPOINT = 'https://511on.ca/api/v2/get/event?format=json&lang=en'
export const SOURCE_NAME = 'ontario-511'

// Shape returned by the Ontario 511 API
interface On511Event {
  ID: number
  SourceId: string
  Organization: string
  RoadwayName: string
  DirectionOfTravel: string | null
  Description: string
  Reported: number       // unix seconds
  LastUpdated: number    // unix seconds
  StartDate: number      // unix seconds
  PlannedEndDate: number // unix seconds (0 if unknown)
  LanesAffected: string | null
  Latitude: number
  Longitude: number
  EventType: string      // 'roadwork' | 'accident' | 'closedRoad' | etc.
  IsFullClosure: boolean
  Severity: string
}

export async function fetchRaw(): Promise<unknown> {
  const res = await fetch(ENDPOINT, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Ontario 511 fetch failed: HTTP ${res.status}`)
  return res.json()
}

function buildTitle(e: On511Event): string {
  const typeLabel =
    e.EventType === 'roadwork' ? 'Roadwork'
    : e.EventType === 'closedRoad' ? 'Road Closure'
    : e.IsFullClosure ? 'Road Closure'
    : 'Road Event'
  const dir = e.DirectionOfTravel ? ` (${e.DirectionOfTravel})` : ''
  return `${typeLabel}: ${e.RoadwayName}${dir}`
}

export function parseEvents(raw: unknown): CanonicalEvent[] {
  const events = raw as On511Event[]
  return events
    .filter((e) => e.Latitude !== 0 && e.Longitude !== 0)
    .filter((e) => isWithinGtaBounds(e.Latitude, e.Longitude))
    .map((e) => ({
      sourceId: e.ID.toString(),
      sourceType: 'OFFICIAL_API' as const,
      category: 'ROAD' as const,
      title: buildTitle(e),
      description: e.Description,
      lat: e.Latitude,
      lng: e.Longitude,
      confidence: calculateConfidence({ sourceType: 'OFFICIAL_API', ageMs: 0 }),
      startedAt: new Date(e.StartDate * 1000),
      expiresAt: e.PlannedEndDate ? new Date(e.PlannedEndDate * 1000) : null,
      rawPayload: e as unknown as Record<string, unknown>,
      metadata: {
        organization: e.Organization,
        roadwayName: e.RoadwayName,
        direction: e.DirectionOfTravel,
        isFullClosure: e.IsFullClosure,
        severity: e.Severity,
        lanesAffected: e.LanesAffected,
        eventType: e.EventType,
      },
    }))
}
