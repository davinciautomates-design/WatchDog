import { XMLParser } from 'fast-xml-parser'
import { redis } from '../../lib/redis'
import { calculateConfidence } from '@watchdog/utils'
import type { CanonicalEvent } from '../../types'

// Toronto Fire Services — Live CAD Feed.
// Source: https://www.toronto.ca/app_content/fire-active-incidents/
// Underlying XML: https://www.toronto.ca/data/fire/livecad.xml
// Updated every ~2 minutes by the city. Shows currently active incidents only.
// Includes fire, medical assists (EMS co-response), rescues, and vehicle accidents.
export const SOURCE_NAME = 'tfs-livecad'

const FEED_URL = 'https://www.toronto.ca/data/fire/livecad.xml'
// Geocode cache: 7 days — street intersections don't move
const GEOCODE_TTL = 7 * 24 * 60 * 60

interface TfsRawEvent {
  prime_street?: string
  cross_streets?: string
  dispatch_time: string
  event_num: string
  event_type: string
  alarm_lev: string | number
  beat: string
  units_disp?: string
}

// Strip city suffix (", SC", ", EY", etc.) from prime_street
function stripCitySuffix(s: string): string {
  return s.replace(/,\s*[A-Z]{2,3}$/, '').trim()
}

// FSA (Forward Sortation Area) centroids for Toronto.
// Used when medical calls only provide a 3-character postal district (privacy redaction by TFS).
// Coordinates are neighbourhood centroids accurate to within ~0.5 km.
const FSA_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  M1B: { lat: 43.806, lng: -79.195 }, M1C: { lat: 43.785, lng: -79.131 }, M1E: { lat: 43.764, lng: -79.188 },
  M1G: { lat: 43.771, lng: -79.218 }, M1H: { lat: 43.774, lng: -79.239 }, M1J: { lat: 43.745, lng: -79.231 },
  M1K: { lat: 43.728, lng: -79.260 }, M1L: { lat: 43.711, lng: -79.276 }, M1M: { lat: 43.723, lng: -79.234 },
  M1N: { lat: 43.693, lng: -79.257 }, M1P: { lat: 43.757, lng: -79.274 }, M1R: { lat: 43.751, lng: -79.296 },
  M1S: { lat: 43.795, lng: -79.262 }, M1T: { lat: 43.783, lng: -79.304 }, M1V: { lat: 43.817, lng: -79.280 },
  M1W: { lat: 43.797, lng: -79.328 }, M1X: { lat: 43.831, lng: -79.251 }, M2H: { lat: 43.804, lng: -79.362 },
  M2J: { lat: 43.777, lng: -79.367 }, M2K: { lat: 43.788, lng: -79.384 }, M2L: { lat: 43.759, lng: -79.375 },
  M2M: { lat: 43.795, lng: -79.408 }, M2N: { lat: 43.769, lng: -79.408 }, M2P: { lat: 43.750, lng: -79.387 },
  M2R: { lat: 43.783, lng: -79.426 }, M3A: { lat: 43.754, lng: -79.329 }, M3B: { lat: 43.746, lng: -79.352 },
  M3C: { lat: 43.726, lng: -79.336 }, M3H: { lat: 43.759, lng: -79.444 }, M3J: { lat: 43.757, lng: -79.491 },
  M3K: { lat: 43.738, lng: -79.464 }, M3L: { lat: 43.740, lng: -79.488 }, M3M: { lat: 43.727, lng: -79.495 },
  M3N: { lat: 43.762, lng: -79.521 }, M4A: { lat: 43.729, lng: -79.310 }, M4B: { lat: 43.707, lng: -79.311 },
  M4C: { lat: 43.697, lng: -79.322 }, M4E: { lat: 43.676, lng: -79.295 }, M4G: { lat: 43.709, lng: -79.367 },
  M4H: { lat: 43.703, lng: -79.343 }, M4J: { lat: 43.686, lng: -79.339 }, M4K: { lat: 43.680, lng: -79.352 },
  M4L: { lat: 43.669, lng: -79.316 }, M4M: { lat: 43.659, lng: -79.340 }, M4N: { lat: 43.728, lng: -79.392 },
  M4P: { lat: 43.712, lng: -79.388 }, M4R: { lat: 43.720, lng: -79.404 }, M4S: { lat: 43.706, lng: -79.383 },
  M4T: { lat: 43.700, lng: -79.383 }, M4V: { lat: 43.686, lng: -79.408 }, M4W: { lat: 43.676, lng: -79.385 },
  M4X: { lat: 43.665, lng: -79.366 }, M4Y: { lat: 43.666, lng: -79.381 }, M5A: { lat: 43.651, lng: -79.358 },
  M5B: { lat: 43.659, lng: -79.375 }, M5C: { lat: 43.649, lng: -79.377 }, M5E: { lat: 43.644, lng: -79.371 },
  M5G: { lat: 43.656, lng: -79.389 }, M5H: { lat: 43.647, lng: -79.381 }, M5J: { lat: 43.641, lng: -79.381 },
  M5K: { lat: 43.648, lng: -79.376 }, M5L: { lat: 43.648, lng: -79.379 }, M5M: { lat: 43.731, lng: -79.421 },
  M5N: { lat: 43.725, lng: -79.411 }, M5P: { lat: 43.700, lng: -79.414 }, M5R: { lat: 43.670, lng: -79.411 },
  M5S: { lat: 43.664, lng: -79.394 }, M5T: { lat: 43.655, lng: -79.407 }, M5V: { lat: 43.642, lng: -79.396 },
  M5W: { lat: 43.641, lng: -79.378 }, M5X: { lat: 43.647, lng: -79.381 }, M6A: { lat: 43.723, lng: -79.450 },
  M6B: { lat: 43.719, lng: -79.447 }, M6C: { lat: 43.689, lng: -79.435 }, M6E: { lat: 43.678, lng: -79.454 },
  M6G: { lat: 43.663, lng: -79.424 }, M6H: { lat: 43.657, lng: -79.432 }, M6J: { lat: 43.648, lng: -79.420 },
  M6K: { lat: 43.641, lng: -79.428 }, M6L: { lat: 43.706, lng: -79.473 }, M6M: { lat: 43.690, lng: -79.478 },
  M6N: { lat: 43.669, lng: -79.474 }, M6P: { lat: 43.660, lng: -79.467 }, M6R: { lat: 43.648, lng: -79.452 },
  M6S: { lat: 43.649, lng: -79.479 }, M7A: { lat: 43.662, lng: -79.390 }, M7R: { lat: 43.636, lng: -79.616 },
  M7Y: { lat: 43.662, lng: -79.347 }, M8V: { lat: 43.604, lng: -79.503 }, M8W: { lat: 43.604, lng: -79.542 },
  M8X: { lat: 43.653, lng: -79.510 }, M8Y: { lat: 43.636, lng: -79.482 }, M8Z: { lat: 43.621, lng: -79.521 },
  M9A: { lat: 43.660, lng: -79.532 }, M9B: { lat: 43.649, lng: -79.558 }, M9C: { lat: 43.643, lng: -79.581 },
  M9L: { lat: 43.758, lng: -79.572 }, M9M: { lat: 43.730, lng: -79.542 }, M9N: { lat: 43.706, lng: -79.518 },
  M9P: { lat: 43.696, lng: -79.531 }, M9R: { lat: 43.679, lng: -79.557 }, M9V: { lat: 43.739, lng: -79.588 },
  M9W: { lat: 43.706, lng: -79.592 },
}

function buildAddressQuery(e: TfsRawEvent): { query: string; fsaFallback?: { lat: number; lng: number } } | null {
  const prime = stripCitySuffix((e.prime_street ?? '').trim())
  const cross = (e.cross_streets ?? '').trim()

  // Postal FSA only (medical calls redact the precise address for privacy)
  if (/^[A-Z]\d[A-Z]$/i.test(prime) && !cross) {
    const fsa = prime.toUpperCase()
    const fallback = FSA_CENTROIDS[fsa]
    if (fallback) return { query: fsa, fsaFallback: fallback }
    return null
  }

  // Full intersection: drop "and" — Nominatim finds "STREET1 STREET2 CITY" better
  if (prime && cross) {
    const firstCross = cross.split('/')[0].trim()
    return { query: `${prime} ${firstCross} Toronto Ontario Canada` }
  }

  // Cross streets only
  if (cross) {
    const parts = cross.split('/').map((s) => s.trim()).filter(Boolean)
    if (parts.length >= 2) return { query: `${parts[0]} ${parts[1]} Toronto Ontario Canada` }
    return { query: `${cross} Toronto Ontario Canada` }
  }

  if (prime) return { query: `${prime} Toronto Ontario Canada` }

  return null
}

// GTA bounding box for sanity-checking geocode results
const GTA_BOUNDS = { minLat: 43.4, maxLat: 44.1, minLng: -80.0, maxLng: -78.8 }

async function geocodeViaNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `geocode:tfs:${query.toLowerCase()}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached) as { lat: number; lng: number }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ca`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WatchDog Community Safety App/1.0 (davinci.automates@gmail.com)',
        'Accept-Language': 'en',
      },
    })

    if (!res.ok) return null

    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (!data.length) return null

    const lat = parseFloat(data[0].lat)
    const lng = parseFloat(data[0].lon)

    if (
      lat < GTA_BOUNDS.minLat || lat > GTA_BOUNDS.maxLat ||
      lng < GTA_BOUNDS.minLng || lng > GTA_BOUNDS.maxLng
    ) {
      return null
    }

    const result = { lat, lng }
    await redis.setex(cacheKey, GEOCODE_TTL, JSON.stringify(result))

    // Nominatim usage policy: max 1 request/second
    await new Promise((r) => setTimeout(r, 1100))

    return result
  } catch {
    return null
  }
}

function inferCategory(eventType: string): CanonicalEvent['category'] {
  const t = eventType.toUpperCase()
  if (t.includes('MEDICAL') || t === 'MED') return 'AMBULANCE'
  if (t.includes('FIRE')) return 'FIRE'
  if (t.includes('VEHICLE') || t.includes('ACCIDENT') || t.includes('MOTOR')) return 'ROAD'
  return 'SAFETY'
}

function buildTitle(eventType: string, alarmLevel: number): string {
  const normalized = eventType.charAt(0).toUpperCase() + eventType.slice(1).toLowerCase()
  if (alarmLevel >= 2) return `${normalized} (${alarmLevel}-Alarm)`
  return normalized
}

function buildAddress(e: TfsRawEvent): string {
  const prime = stripCitySuffix((e.prime_street ?? '').trim())
  const cross = (e.cross_streets ?? '').trim()
  if (prime && cross) return `${prime} at ${cross.split('/')[0].trim()}`
  if (cross) {
    const parts = cross.split('/').map((s) => s.trim()).filter(Boolean)
    return parts.length >= 2 ? `${parts[0]} & ${parts[1]}` : cross
  }
  return prime || ''
}

/**
 * Fetches the TFS live CAD XML and geocodes all active incidents.
 * Returns CanonicalEvent[] directly so that parseEvents can be a pass-through.
 * Geocoding results are cached in Redis for 7 days to minimise Nominatim calls.
 */
export async function fetchRaw(): Promise<CanonicalEvent[]> {
  const res = await fetch(`${FEED_URL}?t=${Date.now()}`)
  if (!res.ok) throw new Error(`TFS livecad fetch failed: ${res.status}`)

  const xml = await res.text()
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false })
  const parsed = parser.parse(xml)

  const root = parsed?.tfs_active_incidents
  if (!root) return []

  const rawEvents: TfsRawEvent[] = Array.isArray(root.event)
    ? root.event
    : root.event
    ? [root.event]
    : []

  const events: CanonicalEvent[] = []

  for (const e of rawEvents) {
    const addressResult = buildAddressQuery(e)
    if (!addressResult) continue

    // FSA-only events (medical privacy redaction): use hardcoded neighbourhood centroid
    let coords: { lat: number; lng: number } | null = addressResult.fsaFallback ?? null
    // Full intersection queries: geocode via Nominatim (cached in Redis)
    if (!coords) {
      coords = await geocodeViaNominatim(addressResult.query)
    }
    if (!coords) continue

    const alarmLevel = parseInt(String(e.alarm_lev)) || 0
    const category = inferCategory(e.event_type)
    const unitCount = e.units_disp?.split(',').filter((u) => u.trim()).length ?? 0

    const confidence = Math.min(
      calculateConfidence({ sourceType: 'OFFICIAL_API' }),
      alarmLevel >= 2 ? 95 : 85,
    )

    const startedAt = new Date(e.dispatch_time)
    // Active incidents: fire stays longer, medicals resolve fast
    const ttlHours = alarmLevel >= 2 ? 8 : category === 'AMBULANCE' ? 2 : 4
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

    events.push({
      sourceId: e.event_num,
      sourceType: 'OFFICIAL_API',
      category,
      title: buildTitle(e.event_type, alarmLevel),
      description: unitCount > 0
        ? `${unitCount} unit${unitCount !== 1 ? 's' : ''} responding${alarmLevel > 0 ? `, alarm level ${alarmLevel}` : ''}`
        : e.event_type,
      lat: coords.lat,
      lng: coords.lng,
      confidence,
      startedAt,
      expiresAt,
      rawPayload: e as unknown as Record<string, unknown>,
      metadata: {
        event_num: e.event_num,
        alarm_level: alarmLevel,
        beat: e.beat,
        units: e.units_disp ?? '',
        address: buildAddress(e),
        source_feed: 'tfs-livecad',
      },
    })
  }

  return events
}

/** Pass-through — fetchRaw already produces CanonicalEvent[]. */
export function parseEvents(raw: unknown): CanonicalEvent[] {
  return raw as CanonicalEvent[]
}
