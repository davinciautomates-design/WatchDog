import { describe, it, expect } from 'vitest'
import { calculateConfidence, communityReportTtlExtensionHours } from './scoring'

// Use a neutral age (1 hour) for tests that focus on base score, not recency.
// At 1h old: no bonus (requires < 30min) and no penalty (requires > 6h).
const NEUTRAL_AGE_MS = 60 * 60 * 1000

describe('calculateConfidence', () => {
  it('gives official API sources high base score', () => {
    const score = calculateConfidence({ sourceType: 'OFFICIAL_API', ageMs: NEUTRAL_AGE_MS })
    expect(score).toBe(90)
  })

  it('gives user reports a low base score', () => {
    const score = calculateConfidence({ sourceType: 'USER', ageMs: NEUTRAL_AGE_MS })
    expect(score).toBe(30)
  })

  it('adds upvote bonus for user reports (capped at 30)', () => {
    const score = calculateConfidence({ sourceType: 'USER', upvoteCount: 10, ageMs: NEUTRAL_AGE_MS })
    expect(score).toBe(30 + 30) // 10 * 5 = 50, capped at 30
  })

  it('adds recency bonus for events under 30 min old', () => {
    const score = calculateConfidence({
      sourceType: 'OFFICIAL_API',
      ageMs: 10 * 60 * 1000, // 10 minutes
    })
    expect(score).toBe(95) // 90 + 5
  })

  it('subtracts points for events older than 6 hours', () => {
    const score = calculateConfidence({
      sourceType: 'OFFICIAL_API',
      ageMs: 7 * 60 * 60 * 1000, // 7 hours
    })
    expect(score).toBe(80) // 90 - 10
  })

  it('clamps score to [0, 100]', () => {
    const high = calculateConfidence({ sourceType: 'OFFICIAL_API', ageMs: 10 * 60 * 1000 })
    expect(high).toBeLessThanOrEqual(100)

    const low = calculateConfidence({ sourceType: 'USER', flagCount: 100 })
    expect(low).toBeGreaterThanOrEqual(0)
  })

  it('adds verify bonus for user reports (capped at 20)', () => {
    const score = calculateConfidence({ sourceType: 'USER', verifyCount: 5, ageMs: NEUTRAL_AGE_MS })
    expect(score).toBe(30 + 20) // 5 * 10 = 50, capped at 20
  })

  it('adds photo bonus for user reports', () => {
    const score = calculateConfidence({ sourceType: 'USER', hasPhoto: true, ageMs: NEUTRAL_AGE_MS })
    expect(score).toBe(35) // 30 + 5
  })
})

describe('communityReportTtlExtensionHours', () => {
  it('returns 2 hours per upvote', () => {
    expect(communityReportTtlExtensionHours(3)).toBe(6)
  })

  it('caps at 18 hours', () => {
    expect(communityReportTtlExtensionHours(100)).toBe(18)
  })
})
