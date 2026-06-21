import { prisma } from '../db/client'
import { cacheDelete } from '../lib/redis'
import type { CanonicalEvent } from '../types'

/**
 * Upserts an event to the database using a raw SQL INSERT...ON CONFLICT.
 * Raw SQL is required because the `location` geography column is not in the
 * Prisma schema (PostGIS types are unsupported by Prisma natively).
 *
 * Cache keys covering the event's area are invalidated after upsert.
 */
export async function upsertEvent(event: CanonicalEvent): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO events (
      id, source_id, source_type, category, title, description,
      location, confidence, status, started_at, expires_at,
      raw_payload, metadata, created_at, updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${event.sourceId},
      ${event.sourceType}::"SourceType",
      ${event.category}::"Category",
      ${event.title},
      ${event.description},
      ST_MakePoint(${event.lng}, ${event.lat})::geography,
      ${event.confidence},
      'ACTIVE'::"EventStatus",
      ${event.startedAt},
      ${event.expiresAt},
      ${JSON.stringify(event.rawPayload)}::jsonb,
      ${JSON.stringify(event.metadata)}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (source_id, source_type) DO UPDATE SET
      title       = EXCLUDED.title,
      description = EXCLUDED.description,
      location    = EXCLUDED.location,
      confidence  = EXCLUDED.confidence,
      expires_at  = EXCLUDED.expires_at,
      metadata    = EXCLUDED.metadata,
      raw_payload = EXCLUDED.raw_payload,
      status      = 'ACTIVE'::"EventStatus",
      updated_at  = NOW()
  `

  // Invalidate all event cache keys — broad invalidation is safe for MVP scale.
  // At high scale, use geohash-scoped keys and only invalidate the relevant cell.
  await cacheDelete('events:*')
}

/** Records the outcome of a data source polling run for observability. */
export async function recordSourceRun(opts: {
  sourceName: string
  eventCount: number
  durationMs: number
  error?: string
}) {
  await prisma.dataSourceRun.create({
    data: {
      sourceName: opts.sourceName,
      fetchedAt: new Date(),
      eventCount: opts.eventCount,
      durationMs: opts.durationMs,
      error: opts.error ?? null,
    },
  })
}
