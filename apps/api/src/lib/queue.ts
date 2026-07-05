import { Queue, Worker, type Processor } from 'bullmq'

// BullMQ bundles its own ioredis, causing TypeScript type conflicts when a
// separate `ioredis` package is also installed. Passing a plain options object
// bypasses this entirely — BullMQ accepts raw RedisOptions too.
function redisOpts(url: string) {
  const { hostname, port, password } = new URL(url)
  return {
    host: hostname,
    port: Number(port) || 6379,
    ...(password ? { password } : {}),
    maxRetriesPerRequest: null, // required by BullMQ for blocking commands
  }
}

const connection = redisOpts(process.env.REDIS_URL ?? 'redis://localhost:6379')

export const DATA_SOURCES_QUEUE = 'data-sources'

export const queue = new Queue(DATA_SOURCES_QUEUE, { connection })

export function createWorker(processor: Processor) {
  return new Worker(DATA_SOURCES_QUEUE, processor, { connection, concurrency: 2 })
}
