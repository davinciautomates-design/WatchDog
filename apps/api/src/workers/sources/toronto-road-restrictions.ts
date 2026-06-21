import { calculateConfidence } from '@watchdog/utils'
import type { CanonicalEvent } from '../../types'

// XML endpoint avoids the JSON encoding bugs in the v3 JSON endpoint.
const ENDPOINT = 'https://secure.toronto.ca/opendata/cart/road_restrictions/v3?format=xml&stream=n'
export const SOURCE_NAME = 'toronto-road-restrictions'

export async function fetchRaw(): Promise<unknown> {
  const res = await fetch(ENDPOINT, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Toronto Road Restrictions fetch failed: HTTP ${res.status}`)
  return res.text()
}

function xmlField(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return m ? m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#13;/g, '').trim() : ''
}

export function parseEvents(raw: unknown): CanonicalEvent[] {
  const xml = raw as string
  const closureBlocks = [...xml.matchAll(/<Closure>([\s\S]*?)<\/Closure>/gi)].map((m) => m[1])

  return closureBlocks
    .map((block): CanonicalEvent | null => {
      const lat = parseFloat(xmlField(block, 'Latitude'))
      const lng = parseFloat(xmlField(block, 'Longitude'))
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null

      const id = xmlField(block, 'Id')
      const road = xmlField(block, 'Road')
      const name = xmlField(block, 'Name')
      const district = xmlField(block, 'District')
      const roadClass = xmlField(block, 'RoadClass')
      const type = xmlField(block, 'Type') || 'ROAD_CLOSED'
      const description = xmlField(block, 'Description') || name
      const contractor = xmlField(block, 'Contractor')
      const startRaw = xmlField(block, 'StartTime')
      const endRaw = xmlField(block, 'EndTime')
      const currImpact = xmlField(block, 'CurrentImpact')

      const typeLabel = type === 'ROAD_CLOSED' ? 'Road Closure' : 'Road Restriction'

      return {
        sourceId: id || `trr-${lat}-${lng}`,
        sourceType: 'GOV_DATA',
        category: 'ROAD',
        title: `${typeLabel}: ${road}`,
        description,
        lat,
        lng,
        confidence: calculateConfidence({ sourceType: 'GOV_DATA', ageMs: 0 }),
        startedAt: startRaw ? new Date(parseInt(startRaw, 10)) : new Date(),
        expiresAt: endRaw ? new Date(parseInt(endRaw, 10)) : null,
        rawPayload: { id, road, name, district, type, contractor } as Record<string, unknown>,
        metadata: { road, district, type, roadClass, contractor, impact: currImpact },
      }
    })
    .filter((e): e is CanonicalEvent => e !== null)
}
