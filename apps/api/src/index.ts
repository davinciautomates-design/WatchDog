import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthRoute } from './routes/health'
import { logger } from './lib/logger'

const server = Fastify({ logger: false })

async function build() {
  await server.register(cors, {
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
  })

  await server.register(healthRoute)

  return server
}

async function start() {
  try {
    const app = await build()
    const port = Number(process.env.PORT) || 3001
    const host = process.env.HOST ?? '0.0.0.0'
    await app.listen({ port, host })
    logger.info({ port, host }, 'Watch Dog API started')
  } catch (err) {
    logger.error(err, 'Server startup failed')
    process.exit(1)
  }
}

start()
