import Redis from 'ioredis'
import { logger } from './logger'

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

redis.on('error', (err) => logger.warn({ err }, 'Redis connection error'))

// ─── Cache helpers ────────────────────────────────────────────────────────────

const DEFAULT_TTL_SECONDS = 30

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key)
  if (!raw) return null
  return JSON.parse(raw) as T
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SECONDS) {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
}

export async function cacheDelete(pattern: string) {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) await redis.del(...keys)
}

/** Build the cache key for the events list endpoint. */
export function eventsKey(lat: number, lng: number, radiusKm: number, categories: string[]) {
  return `events:${lat.toFixed(2)}:${lng.toFixed(2)}:${radiusKm}:${categories.sort().join(',')}`
}
