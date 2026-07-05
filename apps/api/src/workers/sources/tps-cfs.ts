import { calculateConfidence } from '@watchdog/utils'
import type { CanonicalEvent } from '../../types'

// Toronto Police Service — Calls for Service (C4S), public live feed.
// Source: https://experience.arcgis.com/experience/a22f5295933e48a5b0a4c90cd3c4cae1
// Underlying service: TPS ArcGIS (public, no auth required).
// Shows the last ~4 hours of active calls with exact lat/lng coordinates.
// "NoGO" means residential addresses are redacted to intersection-only for privacy.
export const SOURCE_NAME = 'tps-cfs'

const SERVICE_URL =
  'https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/C4S_Public_NoGO/FeatureServer/0/query'

interface C4SFeature {
  attributes: {
    OBJECTID: number
    OCCURRENCE_TIME: number        // Unix milliseconds
    DIVISION: string               // e.g. "D42"
    LATITUDE: number
    LONGITUDE: number
    CALL_TYPE_CODE: string         // e.g. "ASSJU"
    CALL_TYPE: string              // e.g. "ASSAULT JUST OCCURRED"
    CROSS_STREETS: string          // e.g. "KENNEDY RD - MILLIKEN BLVD"
    OCCURRENCE_TIME_AGOL: number
  }
  geometry: { x: number; y: number }
}

type CategoryMapping = {
  category: CanonicalEvent['category']
  confidenceBonus: number
}

const CALL_TYPE_MAP: Record<string, CategoryMapping> = {
  'ASSAULT':                           { category: 'POLICE',       confidenceBonus: 5  },
  'ASSAULT JUST OCCURRED':             { category: 'POLICE',       confidenceBonus: 10 },
  'BREAK & ENTER':                     { category: 'POLICE',       confidenceBonus: 5  },
  'THEFT FROM AUTO':                   { category: 'POLICE',       confidenceBonus: 0  },
  'THEFT IN PROGRESS':                 { category: 'POLICE',       confidenceBonus: 10 },
  'THEFT JUST OCCURRED':               { category: 'POLICE',       confidenceBonus: 5  },
  'FRAUD':                             { category: 'POLICE',       confidenceBonus: 0  },
  'TRESPASS':                          { category: 'POLICE',       confidenceBonus: 0  },
  'ARREST':                            { category: 'POLICE',       confidenceBonus: 5  },
  'HOLDING ONE':                       { category: 'POLICE',       confidenceBonus: 5  },
  'PERSON WITH A GUN':                 { category: 'POLICE',       confidenceBonus: 15 },
  'PERSON WITH A KNIFE':               { category: 'POLICE',       confidenceBonus: 10 },
  'INDECENT EXPOSURE JUST OCCURRED':   { category: 'POLICE',       confidenceBonus: 5  },
  'DISPUTE':                           { category: 'DISTURBANCE', confidenceBonus: 0  },
  'DISORDERLIES':                      { category: 'DISTURBANCE', confidenceBonus: 0  },
  'DEMONSTRATION':                     { category: 'DISTURBANCE', confidenceBonus: 0  },
  'UNKNOWN TROUBLE':                   { category: 'DISTURBANCE', confidenceBonus: 0  },
  'PERSONAL INJURY COLLISION':         { category: 'ROAD',        confidenceBonus: 5  },
  'FAIL TO REMAIN PERSONAL INJURY COLLISION':  { category: 'ROAD', confidenceBonus: 0 },
  'FAIL TO REMAIN PROPERTY DAMAGE COLLISION':  { category: 'ROAD', confidenceBonus: 0 },
  'PROPERTY DAMAGE COLLISION':         { category: 'ROAD',        confidenceBonus: 0  },
  'IMPAIRED DRIVER':                   { category: 'ROAD',        confidenceBonus: 5  },
  'SEE AMBULANCE':                     { category: 'AMBULANCE',   confidenceBonus: 0  },
  'HAZARD':                            { category: 'SAFETY',      confidenceBonus: 0  },
  'WIRES DOWN':                        { category: 'SAFETY',      confidenceBonus: 0  },
  'MISSING JUVENILE LOCATED':          { category: 'SAFETY',      confidenceBonus: 0  },
  'FOUND PROPERTY':                    { category: 'COMMUNITY',   confidenceBonus: 0  },
}

function mapCallType(callType: string): CategoryMapping {
  return CALL_TYPE_MAP[callType] ?? { category: 'COMMUNITY', confidenceBonus: 0 }
}

function formatTitle(callType: string): string {
  return callType.charAt(0) + callType.slice(1).toLowerCase()
}

interface ArcGISResponse {
  features: C4SFeature[]
  error?: { message: string }
}

export async function fetchRaw(): Promise<ArcGISResponse> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: 'OBJECTID,OCCURRENCE_TIME,DIVISION,LATITUDE,LONGITUDE,CALL_TYPE_CODE,CALL_TYPE,CROSS_STREETS',
    orderByFields: 'OCCURRENCE_TIME DESC',
    resultRecordCount: '2000',
    f: 'json',
  })

  const res = await fetch(`${SERVICE_URL}?${params}`)
  if (!res.ok) throw new Error(`TPS C4S fetch failed: ${res.status}`)
  return res.json() as Promise<ArcGISResponse>
}

export function parseEvents(raw: unknown): CanonicalEvent[] {
  const data = raw as ArcGISResponse
  if (data.error) throw new Error(`TPS C4S API error: ${data.error.message}`)

  const events: CanonicalEvent[] = []

  for (const feat of data.features ?? []) {
    const a = feat.attributes
    if (!a.LATITUDE || !a.LONGITUDE) continue

    const { category, confidenceBonus } = mapCallType(a.CALL_TYPE)
    const base = calculateConfidence({ sourceType: 'OFFICIAL_API' })

    const startedAt = new Date(a.OCCURRENCE_TIME)
    // Calls are active; expire 2h after last seen (refreshed on each poll)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000)

    const crossStreets = (a.CROSS_STREETS ?? '').replace(/ - /g, ' & ')

    events.push({
      sourceId: `tps-cfs-${a.OBJECTID}`,
      sourceType: 'OFFICIAL_API',
      category,
      title: formatTitle(a.CALL_TYPE),
      description: [a.DIVISION, crossStreets].filter(Boolean).join(' · '),
      lat: a.LATITUDE,
      lng: a.LONGITUDE,
      confidence: Math.min(base + confidenceBonus, 100),
      startedAt,
      expiresAt,
      rawPayload: a as unknown as Record<string, unknown>,
      metadata: {
        call_type_code: a.CALL_TYPE_CODE,
        division: a.DIVISION,
        cross_streets: crossStreets,
        source_feed: 'tps-cfs',
      },
    })
  }

  return events
}
