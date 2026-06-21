import crypto from 'crypto'
import { prisma } from '../db/client'
import { redis, cacheDelete } from '../lib/redis'
import { calculateConfidence, communityReportTtlExtensionHours } from '@watchdog/utils'
import { CATEGORY_META } from '@watchdog/types'
import type { Category } from '@watchdog/types'

const REPORTS_PER_HOUR = 3
const DEDUP_RADIUS_METRES = 200
const DEDUP_WINDOW_MINUTES = 30
const BASE_TTL_HOURS = 6
const MAX_TTL_HOURS = 24

// ─── IP hashing ───────────────────────────────────────────────────────────────

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex')
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

export async function checkReportRateLimit(ipHash: string): Promise<void> {
  const key = `rate:reports:${ipHash}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 3600)
  if (count > REPORTS_PER_HOUR) {
    // Undo the increment so the window stays accurate
    await redis.decr(key)
    throw Object.assign(new Error('Too many reports. Try again in an hour.'), { statusCode: 429 })
  }
}

// ─── Duplicate detection ──────────────────────────────────────────────────────

interface DuplicateRow { id: string }

async function findDuplicate(category: Category, lat: number, lng: number): Promise<string | null> {
  const windowStart = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000)
  const rows = await prisma.$queryRaw<DuplicateRow[]>`
    SELECT id FROM reports
    WHERE category = ${category}::"Category"
      AND status IN ('PENDING', 'ACTIVE')
      AND created_at >= ${windowStart}
      AND ST_DWithin(
            location::geography,
            ST_MakePoint(${lng}, ${lat})::geography,
            ${DEDUP_RADIUS_METRES}
          )
    ORDER BY created_at DESC
    LIMIT 1
  `
  return rows[0]?.id ?? null
}

// ─── Event creation ───────────────────────────────────────────────────────────

async function upsertReportEvent(reportId: string, category: Category, description: string, lat: number, lng: number, confidence: number, expiresAt: Date) {
  const label = CATEGORY_META[category]?.label ?? category
  await prisma.$executeRaw`
    INSERT INTO events (
      id, source_id, source_type, category, title, description,
      location, confidence, status, started_at, expires_at,
      raw_payload, metadata, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      ${reportId},
      'USER'::"SourceType",
      ${category}::"Category",
      ${`${label}: Community Report`},
      ${description},
      ST_MakePoint(${lng}, ${lat})::geography,
      ${confidence},
      'ACTIVE'::"EventStatus",
      NOW(),
      ${expiresAt},
      '{}'::jsonb,
      ${JSON.stringify({ reportId })}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (source_id, source_type) DO UPDATE SET
      confidence = EXCLUDED.confidence,
      expires_at = EXCLUDED.expires_at,
      description = EXCLUDED.description,
      status     = 'ACTIVE'::"EventStatus",
      updated_at = NOW()
  `
  await cacheDelete('events:*')
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CreateReportInput {
  category: Category
  description: string
  lat: number
  lng: number
  ipHash: string
}

export interface CreateReportResult {
  id: string
  isDuplicate: boolean
  upvoteCount: number
  confidence: number
}

export async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
  const { category, description, lat, lng, ipHash } = input

  // Check for an existing report nearby — treat as upvote instead of new report
  const dupeId = await findDuplicate(category, lat, lng)
  if (dupeId) {
    const result = await upvoteReport(dupeId, ipHash)
    return { id: dupeId, isDuplicate: true, ...result }
  }

  const confidence = calculateConfidence({ sourceType: 'USER' })
  const expiresAt = new Date(Date.now() + BASE_TTL_HOURS * 60 * 60 * 1000)

  const report = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO reports (id, category, description, location, ip_hash, confidence, upvote_count, verify_count, status, created_at)
    VALUES (gen_random_uuid(), ${category}::"Category", ${description}, ST_MakePoint(${lng}, ${lat})::geography, ${ipHash}, ${confidence}, 0, 0, 'ACTIVE'::"ReportStatus", NOW())
    RETURNING id
  `
  const reportId = report[0].id

  // Create a corresponding event so reports appear on the map
  await upsertReportEvent(reportId, category, description, lat, lng, confidence, expiresAt)

  return { id: reportId, isDuplicate: false, upvoteCount: 0, confidence }
}

export interface UpvoteResult {
  upvoteCount: number
  confidence: number
}

export async function upvoteReport(reportId: string, ipHash: string): Promise<UpvoteResult> {
  // Insert upvote — unique constraint (report_id, ip_hash) prevents duplicates
  try {
    await prisma.upvote.create({ data: { reportId, ipHash } })
  } catch {
    // Already upvoted — return current state
    const report = await prisma.report.findUnique({ where: { id: reportId } })
    return { upvoteCount: report?.upvoteCount ?? 0, confidence: report?.confidence ?? 30 }
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: { upvoteCount: { increment: 1 } },
  })

  const newConfidence = calculateConfidence({
    sourceType: 'USER',
    upvoteCount: updated.upvoteCount,
  })

  // Extend TTL by 2h per upvote (capped at 24h total)
  const extensionHours = communityReportTtlExtensionHours(updated.upvoteCount)
  const newExpiry = new Date(Date.now() + (BASE_TTL_HOURS + extensionHours) * 60 * 60 * 1000)
  const expiresAt = newExpiry > new Date(Date.now() + MAX_TTL_HOURS * 60 * 60 * 1000)
    ? new Date(Date.now() + MAX_TTL_HOURS * 60 * 60 * 1000)
    : newExpiry

  await prisma.report.update({ where: { id: reportId }, data: { confidence: newConfidence } })

  // Update the linked event's confidence and TTL
  await prisma.$executeRaw`
    UPDATE events SET confidence = ${newConfidence}, expires_at = ${expiresAt}, updated_at = NOW()
    WHERE source_id = ${reportId} AND source_type = 'USER'::"SourceType"
  `
  await cacheDelete('events:*')

  return { upvoteCount: updated.upvoteCount, confidence: newConfidence }
}
