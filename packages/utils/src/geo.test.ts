import { describe, it, expect } from 'vitest'
import { haversineDistanceKm, isWithinGtaBounds, GTA_CENTRE } from './geo'

describe('haversineDistanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistanceKm(43.65, -79.38, 43.65, -79.38)).toBe(0)
  })

  it('calculates approximate distance between Toronto and Mississauga', () => {
    // Toronto City Hall → Mississauga City Centre (~27 km)
    const dist = haversineDistanceKm(43.6532, -79.3832, 43.5889, -79.6442)
    expect(dist).toBeGreaterThan(20)
    expect(dist).toBeLessThan(35)
  })

  it('is symmetric', () => {
    const d1 = haversineDistanceKm(43.6532, -79.3832, 43.8, -79.5)
    const d2 = haversineDistanceKm(43.8, -79.5, 43.6532, -79.3832)
    expect(d1).toBeCloseTo(d2, 5)
  })
})

describe('isWithinGtaBounds', () => {
  it('accepts GTA centre point', () => {
    expect(isWithinGtaBounds(GTA_CENTRE.lat, GTA_CENTRE.lng)).toBe(true)
  })

  it('rejects points outside GTA (e.g. Ottawa)', () => {
    expect(isWithinGtaBounds(45.4215, -75.6972)).toBe(false)
  })

  it('rejects points in the ocean south of GTA', () => {
    expect(isWithinGtaBounds(40.0, -79.3)).toBe(false)
  })
})
