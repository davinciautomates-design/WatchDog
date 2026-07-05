import { PrismaClient } from '@prisma/client'
import { logger } from '../lib/logger'

// Singleton pattern — one connection pool shared across the entire process.
// Never instantiate PrismaClient in a hot path (e.g. inside a request handler).
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

prisma.$connect().catch((err: unknown) => {
  logger.error(err, 'Failed to connect to database')
  process.exit(1)
})

export { prisma }
