import type { FastifyInstance } from 'fastify'

/**
 * Health check endpoint.
 *
 * Used by:
 *   - Railway/Docker health checks
 *   - CI smoke tests after deployment
 *   - Uptime monitors
 *
 * Future: add database and Redis connectivity checks.
 */
export async function healthRoute(fastify: FastifyInstance) {
  fastify.get('/api/v1/health', async (_req, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    })
  })
}
