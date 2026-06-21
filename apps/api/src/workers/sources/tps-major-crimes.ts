import { calculateConfidence } from '@watchdog/utils'
import type { CanonicalEvent } from '../../types'

// Toronto Police Service — Major Crime Indicators (ArcGIS Feature Service).
// Covers: Assault, Break & Enter, Auto Theft, Robbery, Theft Over.
// Data is updated daily; not real-time but current within ~24 hours.
// Filtered to the current year, most recent 2000 incidents.
const BASE_URL = 'https://services.arcgis.com/S9th0jAJ7bqgIRjw/arcgis/rest/services/Major_Crime_Indicators_Open_Data/FeatureServer/0/query'
export const SOURCE_NAME = 'tps-major-crimes'

const CATEGORY_MAP: Record<string, string> = {
  Assault: 'Assault',
  'Break & Enter': 'Break & Enter',
  'Auto Theft': 'Auto Theft',
  Robbery: 'Robbery',
  'Theft Over': 'Theft Over',
}

interface MciFeature {
  attributes: {
    EVENT_UNIQUE_ID: string
    OCC_DATE: number
    OCC_YEAR: string
    OCC_MONTH: string
    OCC_DAY: string
    OCC_HOUR: string
    LAT_WGS84: number
    LONG_WGS84: number
    CSI_CATEGORY: string
    OFFENCE: string
    PREMISES_TYPE: string
    NEIGHBOURHOOD_158: string
  }
}

interface ArcGISResponse {
  features?: MciFeature[]
  error?: { code: number; message: string }
}

export async function fetchRaw(): Promise<unknown> {
  // Limit to the last 30 days so old incidents don't stay on the map permanently.
  // ArcGIS DATE fields require a quoted date string, not epoch ms.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const params = new URLSearchParams({
    where: `OCC_DATE >= DATE '${cutoff}'`,
    outFields: 'EVENT_UNIQUE_ID,OCC_DATE,OCC_YEAR,OCC_MONTH,OCC_DAY,OCC_HOUR,LAT_WGS84,LONG_WGS84,CSI_CATEGORY,OFFENCE,PREMISES_TYPE,NEIGHBOURHOOD_158',
    orderByFields: 'OCC_DATE DESC',
    resultRecordCount: '2000',
    f: 'json',
  })
  const res = await fetch(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`TPS Major Crimes fetch failed: HTTP ${res.status}`)
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
      const neighbourhood = a.NEIGHBOURHOOD_158 || ''
      const category = CATEGORY_MAP[a.CSI_CATEGORY] ?? a.CSI_CATEGORY

      return {
        sourceId: a.EVENT_UNIQUE_ID,
        sourceType: 'GOV_DATA',
        category: 'POLICE',
        title: `${category}: ${a.OFFENCE}`,
        description: [
          a.PREMISES_TYPE ? `Location type: ${a.PREMISES_TYPE}` : '',
          neighbourhood ? `Neighbourhood: ${neighbourhood}` : '',
          `Division: ${a.NEIGHBOURHOOD_158 || 'Unknown'}`,
        ].filter(Boolean).join(' · '),
        lat: a.LAT_WGS84,
        lng: a.LONG_WGS84,
        confidence: calculateConfidence({ sourceType: 'GOV_DATA', ageMs: Date.now() - occDate.getTime() }),
        startedAt: occDate,
        // 7-day rolling expiry: incidents within our 30-day query window stay
        // visible for a week. Each hourly poll resets the expiry for active records.
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        rawPayload: a as unknown as Record<string, unknown>,
        metadata: {
          eventId: a.EVENT_UNIQUE_ID,
          category: a.CSI_CATEGORY,
          offence: a.OFFENCE,
          premisesType: a.PREMISES_TYPE,
          neighbourhood,
          division: a.NEIGHBOURHOOD_158,
          hour: a.OCC_HOUR,
        },
      }
    })
    .filter((e): e is CanonicalEvent => e !== null)
}
