/**
 * Event lifecycle worker.
 *
 * Runs every 5 minutes to transition events through their lifecycle:
 *   ACTIVE → EXPIRING (30 min before expires_at)
 *   EXPIRING/ACTIVE → EXPIRED (past expires_at)
 *   EXPIRED → ARCHIVED (30 days after expiry)
 *
 * Events without an expires_at are kept ACTIVE indefinitely (re-evaluated
 * when the source stops reporting them, which sets status to EXPIRING).
 */
import { prisma } from '../db/client'
import { logger } from '../lib/logger'

export async function runEventLifecycle(): Promise<void> {
  const now = new Date()
  const expiringThreshold = new Date(now.getTime() + 30 * 60 * 1000)
  const archiveThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [toExpiring, toExpired, toArchived] = await Promise.all([
    // ACTIVE → EXPIRING: expires soon
    prisma.event.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: expiringThreshold, gt: now } },
      data: { status: 'EXPIRING' },
    }),
    // ACTIVE/EXPIRING → EXPIRED: past expiry
    prisma.event.updateMany({
      where: { status: { in: ['ACTIVE', 'EXPIRING'] }, expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    }),
    // EXPIRED → ARCHIVED: old enough to purge from live view
    prisma.event.updateMany({
      where: { status: 'EXPIRED', updatedAt: { lte: archiveThreshold } },
      data: { status: 'ARCHIVED' },
    }),
  ])

  logger.info(
    { toExpiring: toExpiring.count, toExpired: toExpired.count, toArchived: toArchived.count },
    'Event lifecycle tick complete',
  )
}
