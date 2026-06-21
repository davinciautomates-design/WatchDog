/**
 * City of Toronto Road Restrictions data source worker.
 *
 * Fetches live road closures from the City of Toronto's open data portal.
 * This is a high-quality, city-operated feed updated frequently during the day.
 *
 * Source: https://open.toronto.ca/dataset/road-restrictions/
 * Endpoint: https://secure.toronto.ca/opendata/cart/road_restrictions/v3?format=json
 * Suggested poll interval: every 15 minutes
 */
import { calculateConfidence } from '@watchdog/utils'
import type { CanonicalEvent } from '../../types'

const ENDPOINT = 'https://secure.toronto.ca/opendata/cart/road_restrictions/v3?format=json'
export const SOURCE_NAME = 'toronto-road-restrictions'

interface RoadRestriction {
  id: string
  road: string
  name: string
  district: string
  latitude: string   // string decimal
  longitude: string  // string decimal
  roadClass: string
  planned: number
  startTime: string  // unix ms as string
  endTime: string    // unix ms as string
  type: string       // 'ROAD_CLOSED' | 'LANE_RESTRICTION' | etc.
  directionsAffected: string
  description: string
  contractor: string
  maxImpact: string
  currImpact: string
}

interface TRRResponse {
  Closure: RoadRestriction[]
}

export async function fetchRaw(): Promise<unknown> {
  const res = await fetch(ENDPOINT, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Toronto Road Restrictions fetch failed: HTTP ${res.status}`)
  return res.json()
}

export function parseEvents(raw: unknown): CanonicalEvent[] {
  const response = raw as TRRResponse
  const closures = response?.Closure ?? []

  return closures
    .map((c): CanonicalEvent | null => {
      const lat = parseFloat(c.latitude)
      const lng = parseFloat(c.longitude)
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null

      const typeLabel = c.type === 'ROAD_CLOSED' ? 'Road Closure' : 'Road Restriction'

      return {
        sourceId: c.id,
        sourceType: 'GOV_DATA',
        category: 'ROAD',
        title: `${typeLabel}: ${c.road}`,
        description: c.description || c.name,
        lat,
        lng,
        confidence: calculateConfidence({ sourceType: 'GOV_DATA', ageMs: 0 }),
        startedAt: c.startTime ? new Date(parseInt(c.startTime, 10)) : new Date(),
        expiresAt: c.endTime ? new Date(parseInt(c.endTime, 10)) : null,
        rawPayload: c as unknown as Record<string, unknown>,
        metadata: {
          road: c.road,
          district: c.district,
          type: c.type,
          roadClass: c.roadClass,
          directionsAffected: c.directionsAffected,
          contractor: c.contractor,
          impact: c.currImpact,
        },
      }
    })
    .filter((e): e is CanonicalEvent => e !== null)
}
