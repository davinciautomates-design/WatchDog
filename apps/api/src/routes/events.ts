import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Category } from '@watchdog/types'
import { MAX_RADIUS_KM } from '@watchdog/utils'
import { findEventsNearby } from '../db/geo'
import { cacheGet, cacheSet, eventsKey } from '../lib/redis'
import { logger } from '../lib/logger'

const VALID_CATEGORIES: Category[] = [
  'POLICE', 'FIRE', 'AMBULANCE', 'ROAD', 'CRIME',
  'DISTURBANCE', 'SAFETY', 'COMMUNITY',
]

const eventsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_km: z.coerce.number().min(0.1).max(MAX_RADIUS_KM).default(MAX_RADIUS_KM),
  categories: z
    .string()
    .optional()
    .transform((val) =>
      val ? (val.split(',').filter((c) => VALID_CATEGORIES.includes(c as Category)) as Category[]) : [],
    ),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(5000).default(2000),
})

export async function eventsRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/events', async (req, reply) => {
    const parsed = eventsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return reply.status(422).send({
        data: null,
        meta: {},
        errors: parsed.error.issues.map((i) => ({
          code: 'VALIDATION_ERROR',
          message: i.message,
          field: i.path.join('.'),
        })),
      })
    }

    const { lat, lng, radius_km, categories, page, limit } = parsed.data
    const cacheKey = eventsKey(lat, lng, radius_km, categories)

    // Try cache first
    const cached = await cacheGet<object>(cacheKey).catch(() => null)
    if (cached) {
      reply.header('X-Cache', 'HIT')
      return reply.send(cached)
    }

    try {
      const { events, total } = await findEventsNearby({
        lat,
        lng,
        radiusKm: radius_km,
        categories,
        page,
        limit,
      })

      const response = {
        data: events,
        meta: {
          total,
          page,
          limit,
          generatedAt: new Date().toISOString(),
        },
        errors: [],
      }

      // Cache asynchronously — don't block the response
      cacheSet(cacheKey, response).catch((err) =>
        logger.warn({ err }, 'Failed to write events to cache'),
      )

      reply.header('X-Cache', 'MISS')
      return reply.send(response)
    } catch (err) {
      logger.error({ err }, 'Failed to fetch events')
      return reply.status(500).send({
        data: null,
        meta: {},
        errors: [{ code: 'INTERNAL_ERROR', message: 'Failed to fetch events' }],
      })
    }
  })

  fastify.get('/api/v1/events/categories', async (_req, reply) => {
    const { CATEGORY_META } = await import('@watchdog/types')
    return reply.send({ data: Object.values(CATEGORY_META), errors: [] })
  })
}
