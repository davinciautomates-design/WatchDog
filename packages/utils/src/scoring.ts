import type { SourceType } from '@watchdog/types'

const BASE_SCORE: Record<SourceType, number> = {
  OFFICIAL_API: 90,
  GOV_DATA: 80,
  MUNICIPAL: 70,
  RSS: 60,
  USER: 30,
}

const MAX_UPVOTE_BONUS = 30
const MAX_VERIFY_BONUS = 20
const UPVOTE_PER_POINT = 5
const VERIFY_PER_POINT = 10

export interface ConfidenceOptions {
  sourceType: SourceType
  upvoteCount?: number
  verifyCount?: number
  flagCount?: number
  hasPhoto?: boolean
  ageMs?: number
}

/**
 * Computes a 0–100 confidence score for an event.
 * Official sources start high; user reports earn score through community verification.
 */
export function calculateConfidence(opts: ConfidenceOptions): number {
  const {
    sourceType,
    upvoteCount = 0,
    verifyCount = 0,
    flagCount = 0,
    hasPhoto = false,
    ageMs = 0,
  } = opts

  let score = BASE_SCORE[sourceType]

  if (sourceType === 'USER') {
    score += Math.min(upvoteCount * UPVOTE_PER_POINT, MAX_UPVOTE_BONUS)
    score += Math.min(verifyCount * VERIFY_PER_POINT, MAX_VERIFY_BONUS)
    score -= flagCount * 5
    if (hasPhoto) score += 5
  }

  // Recency adjustments apply to all source types
  const ageHours = ageMs / (1000 * 60 * 60)
  if (ageHours < 0.5) {
    score += 5
  } else if (ageHours > 6) {
    score -= 10
  }

  return Math.max(0, Math.min(100, score))
}

/**
 * Returns the number of hours to extend a community report TTL per upvote.
 * Capped to prevent reports living forever.
 */
export function communityReportTtlExtensionHours(upvoteCount: number): number {
  return Math.min(upvoteCount * 2, 18) // max +18h on top of base 6h = 24h cap
}
