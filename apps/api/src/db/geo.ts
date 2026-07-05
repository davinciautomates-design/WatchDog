import { Prisma } from '@prisma/client'
import type { Event } from '@watchdog/types'
import type { Category } from '@watchdog/types'
import { prisma } from './client'

// Row shape returned by the raw PostGIS query
type RawEventRow = {
  id: string
  source_type: string
  category: string
  title: string
  description: string
  lat: number
  lng: number
  address: string | null
  confidence: number
  status: string
  started_at: Date
  expires_at: Date | null
  metadata: unknown
  created_at: Date
  updated_at: Date
  total_count: bigint
}

export interface FindEventsOptions {
  lat: number
  lng: number
  radiusKm: number
  categories: Category[]
  page: number
  limit: number
}

export interface FindEventsResult {
  events: Event[]
  total: number
}

export async function findEventsNearby({
  lat,
  lng,
  radiusKm,
  categories,
  page,
  limit,
}: FindEventsOptions): Promise<FindEventsResult> {
  const radiusMetres = radiusKm * 1000
  const offset = (page - 1) * limit

  const catFilter =
    categories.length > 0
      ? Prisma.sql`AND e.category = ANY(ARRAY[${Prisma.join(categories)}]::"Category"[])`
      : Prisma.empty

  const rows = await prisma.$queryRaw<RawEventRow[]>`
    SELECT
      e.id,
      e.source_type,
      e.category,
      e.title,
      e.description,
      ST_Y(e.location::geometry)  AS lat,
      ST_X(e.location::geometry)  AS lng,
      e.address,
      e.confidence,
      e.status,
      e.started_at,
      e.expires_at,
      e.metadata,
      e.created_at,
      e.updated_at,
      COUNT(*) OVER()             AS total_count
    FROM events e
    WHERE e.status IN ('ACTIVE', 'EXPIRING')
      AND e.location IS NOT NULL
      AND ST_DWithin(
            e.location::geography,
            ST_MakePoint(${lng}, ${lat})::geography,
            ${radiusMetres}
          )
    ${catFilter}
    ORDER BY e.confidence DESC, e.category, e.started_at DESC
    LIMIT  ${limit}
    OFFSET ${offset}
  `

  const total = rows.length > 0 ? Number(rows[0].total_count) : 0

  const events: Event[] = rows.map((r) => ({
    id: r.id,
    sourceId: null,
    sourceType: r.source_type as Event['sourceType'],
    category: r.category as Category,
    title: r.title,
    description: r.description,
    location: { lat: r.lat, lng: r.lng },
    address: r.address,
    confidence: r.confidence,
    status: r.status as Event['status'],
    startedAt: r.started_at.toISOString(),
    expiresAt: r.expires_at?.toISOString() ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  }))

  return { events, total }
}
