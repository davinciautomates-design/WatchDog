import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { isWithinGtaBounds } from '@watchdog/utils'
import type { Category } from '@watchdog/types'
import { CATEGORY_META } from '@watchdog/types'
import { hashIp, checkReportRateLimit, createReport, upvoteReport } from '../services/ReportService'
import { logger } from '../lib/logger'

const VALID_CATEGORIES = Object.keys(CATEGORY_META) as Category[]

const createReportSchema = z.object({
  category: z.enum(VALID_CATEGORIES as [Category, ...Category[]]),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const upvoteParamsSchema = z.object({
  id: z.string().uuid('Invalid report ID'),
})

function getClientIp(req: { ip: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.ip
}

export async function reportsRoute(fastify: FastifyInstance) {
  fastify.post('/api/v1/reports', async (req, reply) => {
    const parsed = createReportSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.status(422).send({
        data: null,
        errors: parsed.error.issues.map((i) => ({
          code: 'VALIDATION_ERROR',
          message: i.message,
          field: i.path.join('.'),
        })),
      })
    }

    const { category, description, lat, lng } = parsed.data

    if (!isWithinGtaBounds(lat, lng)) {
      return reply.status(422).send({
        data: null,
        errors: [{ code: 'OUT_OF_BOUNDS', message: 'Location must be within the Greater Toronto Area', field: 'lat/lng' }],
      })
    }

    const ipHash = hashIp(getClientIp(req as Parameters<typeof getClientIp>[0]))

    try {
      await checkReportRateLimit(ipHash)
    } catch (err) {
      const e = err as { statusCode?: number; message: string }
      return reply.status(e.statusCode ?? 429).send({
        data: null,
        errors: [{ code: 'RATE_LIMITED', message: e.message }],
      })
    }

    try {
      const result = await createReport({ category, description, lat, lng, ipHash })
      return reply.status(result.isDuplicate ? 200 : 201).send({ data: result, errors: [] })
    } catch (err) {
      logger.error({ err }, 'Failed to create report')
      return reply.status(500).send({
        data: null,
        errors: [{ code: 'INTERNAL_ERROR', message: 'Failed to submit report' }],
      })
    }
  })

  fastify.post('/api/v1/reports/:id/upvote', async (req, reply) => {
    const params = upvoteParamsSchema.safeParse(req.params)
    if (!params.success) {
      return reply.status(422).send({ data: null, errors: [{ code: 'INVALID_ID', message: 'Invalid report ID' }] })
    }

    const ipHash = hashIp(getClientIp(req as Parameters<typeof getClientIp>[0]))

    try {
      const result = await upvoteReport(params.data.id, ipHash)
      return reply.send({ data: result, errors: [] })
    } catch (err) {
      logger.error({ err }, 'Failed to upvote report')
      return reply.status(500).send({
        data: null,
        errors: [{ code: 'INTERNAL_ERROR', message: 'Failed to upvote report' }],
      })
    }
  })
}
