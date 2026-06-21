import { calculateConfidence, isWithinGtaBounds } from '@watchdog/utils'
import type { CanonicalEvent } from '../../types'

// NAAD (National Alert Aggregation and Dissemination) public Atom feed.
// This aggregates all Environment Canada CAP alerts across Canada.
// We filter to English-language alerts whose polygon centroids fall within the GTA bounding box.
const ENDPOINT = 'https://rss.naad-adna.pelmorex.com/'
export const SOURCE_NAME = 'environment-canada'

// Map CAP severity levels to SAFETY category confidence modifiers
const SEVERITY_CONFIDENCE: Record<string, number> = {
  Extreme: 20,
  Severe: 15,
  Moderate: 10,
  Minor: 5,
  Unknown: 0,
}

function xmlField(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '').trim() : ''
}

function xmlAttr(block: string, tag: string, attr: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i'))
  return m ? m[1] : ''
}

function polygonCentroid(polygon: string): { lat: number; lng: number } | null {
  const pairs = polygon.trim().split(/\s+/)
  if (pairs.length < 2) return null
  let sumLat = 0, sumLng = 0, count = 0
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const lat = parseFloat(pairs[i])
    const lng = parseFloat(pairs[i + 1])
    if (!isNaN(lat) && !isNaN(lng)) { sumLat += lat; sumLng += lng; count++ }
  }
  return count > 0 ? { lat: sumLat / count, lng: sumLng / count } : null
}

export async function fetchRaw(): Promise<unknown> {
  const res = await fetch(ENDPOINT, {
    signal: AbortSignal.timeout(15_000),
    headers: { 'Accept': 'application/atom+xml, application/xml, text/xml' },
  })
  if (!res.ok) throw new Error(`Environment Canada fetch failed: HTTP ${res.status}`)
  return res.text()
}

export function parseEvents(raw: unknown): CanonicalEvent[] {
  const xml = raw as string
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)].map(m => m[1])

  return entries
    .map((entry): CanonicalEvent | null => {
      // Only English alerts
      const langCat = [...entry.matchAll(/<category[^>]*term="([^"]*)"/gi)].map(m => m[1])
      const lang = langCat.find(t => t.startsWith('language='))
      if (lang && lang !== 'language=en-CA') return null

      // Extract first polygon (alerts can have many regions; use first)
      const polygonMatch = entry.match(/<georss:polygon>([\s\S]*?)<\/georss:polygon>/i)
      if (!polygonMatch) return null
      const centroid = polygonCentroid(polygonMatch[1])
      if (!centroid) return null
      if (!isWithinGtaBounds(centroid.lat, centroid.lng)) return null

      const id = xmlField(entry, 'id')
      const title = xmlField(entry, 'title')
      const updated = xmlField(entry, 'updated')
      const summary = xmlField(entry, 'summary')

      const severity = langCat.find(t => t.startsWith('severity='))?.split('=')[1] ?? 'Unknown'
      const eventType = langCat.find(t => t.startsWith('event='))?.split('=')[1] ?? 'alert'

      const confidenceBonus = SEVERITY_CONFIDENCE[severity] ?? 0
      const base = calculateConfidence({ sourceType: 'OFFICIAL_API', ageMs: updated ? Date.now() - new Date(updated).getTime() : 0 })

      return {
        sourceId: id,
        sourceType: 'OFFICIAL_API',
        category: 'SAFETY',
        title: title || `Weather alert: ${eventType}`,
        description: summary.slice(0, 800) || title,
        lat: centroid.lat,
        lng: centroid.lng,
        confidence: Math.min(100, base + confidenceBonus),
        startedAt: updated ? new Date(updated) : new Date(),
        expiresAt: null,
        rawPayload: { id, title, severity, eventType } as Record<string, unknown>,
        metadata: { severity, eventType, lang: 'en-CA' },
      }
    })
    .filter((e): e is CanonicalEvent => e !== null)
}
