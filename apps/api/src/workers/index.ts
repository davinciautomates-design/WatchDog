/**
 * Worker scheduler.
 *
 * Registers all repeating BullMQ jobs and starts the worker process.
 * Called once on API server startup.
 *
 * Adding a new data source:
 *   1. Create apps/api/src/workers/sources/{name}.ts
 *   2. Add a case in the switch below
 *   3. Add a queue.add() call with the desired repeat interval
 */
import type { Job } from 'bullmq'
import type { CanonicalEvent } from '../types'
import { queue, createWorker } from '../lib/queue'
import { logger } from '../lib/logger'
import { upsertEvent, recordSourceRun } from '../services/EventService'
import { fetchRaw as fetch511, parseEvents as parse511, SOURCE_NAME as SRC_511 } from './sources/ontario-511'
import { fetchRaw as fetchTRR, parseEvents as parseTRR, SOURCE_NAME as SRC_TRR } from './sources/toronto-road-restrictions'
import { fetchRaw as fetchEnvCa, parseEvents as parseEnvCa, SOURCE_NAME as SRC_ENVCA } from './sources/environment-canada'
import { runEventLifecycle } from './lifecycle'

const JOB_ONTARIO_511          = 'ontario-511'
const JOB_TORONTO_ROAD         = 'toronto-road-restrictions'
const JOB_ENV_CANADA           = 'environment-canada'
const JOB_EVENT_LIFECYCLE      = 'event-lifecycle'

async function runSource(
  sourceName: string,
  fetchRaw: () => Promise<unknown>,
  parseEvents: (raw: unknown) => CanonicalEvent[],
): Promise<void> {
  const start = Date.now()
  let eventCount = 0
  let error: string | undefined

  try {
    const raw = await fetchRaw()
    const events = parseEvents(raw)
    eventCount = events.length

    for (const event of events) {
      await upsertEvent(event)
    }

    logger.info({ sourceName, eventCount }, 'Data source run complete')
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    logger.error({ sourceName, err }, 'Data source run failed')
  } finally {
    await recordSourceRun({ sourceName, eventCount, durationMs: Date.now() - start, error })
  }
}

async function processJob(job: Job): Promise<void> {
  switch (job.name) {
    case JOB_ONTARIO_511:
      await runSource(SRC_511, fetch511, parse511)
      break
    case JOB_TORONTO_ROAD:
      await runSource(SRC_TRR, fetchTRR, parseTRR)
      break
    case JOB_ENV_CANADA:
      await runSource(SRC_ENVCA, fetchEnvCa, parseEnvCa)
      break
    case JOB_EVENT_LIFECYCLE:
      await runEventLifecycle()
      break
    default:
      logger.warn({ jobName: job.name }, 'Unknown job name — skipping')
  }
}

export async function startWorkers(): Promise<void> {
  // Register repeating jobs (idempotent — BullMQ deduplicates by job key)
  await queue.add(JOB_ONTARIO_511,     {}, { repeat: { every: 2  * 60 * 1000 }, jobId: JOB_ONTARIO_511 })
  await queue.add(JOB_TORONTO_ROAD,    {}, { repeat: { every: 15 * 60 * 1000 }, jobId: JOB_TORONTO_ROAD })
  await queue.add(JOB_ENV_CANADA,      {}, { repeat: { every: 10 * 60 * 1000 }, jobId: JOB_ENV_CANADA })
  await queue.add(JOB_EVENT_LIFECYCLE, {}, { repeat: { every: 5  * 60 * 1000 }, jobId: JOB_EVENT_LIFECYCLE })

  const worker = createWorker(processJob)

  worker.on('completed', (job) => logger.debug({ jobName: job.name }, 'Job completed'))
  worker.on('failed',    (job, err) => logger.error({ jobName: job?.name, err }, 'Job failed'))

  logger.info('BullMQ workers started')

  // Run all sources immediately on startup so the map isn't empty on first load
  await Promise.allSettled([
    runSource(SRC_511, fetch511, parse511),
    runSource(SRC_TRR, fetchTRR, parseTRR),
    runSource(SRC_ENVCA, fetchEnvCa, parseEnvCa),
    runEventLifecycle(),
  ])
}
