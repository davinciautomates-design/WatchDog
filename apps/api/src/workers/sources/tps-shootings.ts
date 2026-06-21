import { calculateConfidence } from '@watchdog/utils'
import type { CanonicalEvent } from '../../types'

// Toronto Police Service — Shootings & Firearm Discharges (ArcGIS Feature Service).
// Includes EVENT_TYPE, deaths, injuries, and neighbourhood.
// Updated daily; typically complete within 24 hours of occurrence.
const BASE_URL = 'https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/Shooting_and_Firearm_Discharges_Open_Data/FeatureServer/0/query'
export const SOURCE_NAME = 'tps-shootings'

interface ShootingFeature {
  attributes: {
    EVENT_UNIQUE_ID: string
    OCC_DATE: number
    OCC_YEAR: string
    OCC_MONTH: string
    OCC_DAY: string
    OCC_HOUR: string
    OCC_TIME_RANGE: string
    DIVISION: string
    DEATH: number
    INJURIES: number
    EVENT_TYPE: string
    NEIGHBOURHOOD_158: string
    LAT_WGS84: number
    LONG_WGS84: number
  }
}

interface ArcGISResponse {
  features?: ShootingFeature[]
  error?: { code: number; message: string }
}

export async function fetchRaw(): Promise<unknown> {
  const year = new Date().getFullYear().toString()
  const params = new URLSearchParams({
    where: `OCC_YEAR='${year}'`,
    outFields: 'EVENT_UNIQUE_ID,OCC_DATE,OCC_YEAR,OCC_MONTH,OCC_DAY,OCC_HOUR,OCC_TIME_RANGE,DIVISION,DEATH,INJURIES,EVENT_TYPE,NEIGHBOURHOOD_158,LAT_WGS84,LONG_WGS84',
    orderByFields: 'OCC_DATE DESC',
    resultRecordCount: '1000',
    f: 'json',
  })
  const res = await fetch(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`TPS Shootings fetch failed: HTTP ${res.status}`)
  return res.json()
}

export function parseEvents(raw: unknown): CanonicalEvent[] {
  const data = raw as ArcGISResponse
  if (data.error) throw new Error(`ArcGIS error ${data.error.code}: ${data.error.message}`)
  const features = data.features ?? []

  return features
    .map((feat): CanonicalEvent | null => {
      const a = feat.attributes
      if (!a.LAT_WGS84 || !a.LONG_WGS84 || a.LAT_WGS84 === 0) return null

      const occDate = new Date(a.OCC_DATE)
      const casualties = [
        a.DEATH > 0 ? `${a.DEATH} death${a.DEATH > 1 ? 's' : ''}` : '',
        a.INJURIES > 0 ? `${a.INJURIES} injur${a.INJURIES > 1 ? 'ies' : 'y'}` : '',
      ].filter(Boolean)

      const title = casualties.length > 0
        ? `${a.EVENT_TYPE}: ${casualties.join(', ')}`
        : a.EVENT_TYPE

      return {
        sourceId: a.EVENT_UNIQUE_ID,
        sourceType: 'OFFICIAL_API',
        category: 'CRIME',
        title,
        description: [
          a.NEIGHBOURHOOD_158 ? `Neighbourhood: ${a.NEIGHBOURHOOD_158}` : '',
          a.OCC_TIME_RANGE ? `Time: ${a.OCC_TIME_RANGE}` : '',
          `Division: ${a.DIVISION}`,
        ].filter(Boolean).join(' · '),
        lat: a.LAT_WGS84,
        lng: a.LONG_WGS84,
        // Shootings rank higher — OFFICIAL_API base + recency boost
        confidence: Math.min(100, calculateConfidence({ sourceType: 'OFFICIAL_API', ageMs: Date.now() - occDate.getTime() }) + (a.DEATH > 0 ? 5 : 0)),
        startedAt: occDate,
        // Rolling expiry from import time — TPS data has a publication lag.
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        rawPayload: a as unknown as Record<string, unknown>,
        metadata: {
          eventId: a.EVENT_UNIQUE_ID,
          eventType: a.EVENT_TYPE,
          death: a.DEATH,
          injuries: a.INJURIES,
          neighbourhood: a.NEIGHBOURHOOD_158,
          division: a.DIVISION,
          timeRange: a.OCC_TIME_RANGE,
        },
      }
    })
    .filter((e): e is CanonicalEvent => e !== null)
}
