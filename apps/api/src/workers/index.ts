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
import { fetchRaw as fetchMci, parseEvents as parseMci, SOURCE_NAME as SRC_MCI } from './sources/tps-major-crimes'
import { fetchRaw as fetchShootings, parseEvents as parseShootings, SOURCE_NAME as SRC_SHOOTINGS } from './sources/tps-shootings'
import { fetchRaw as fetchTfsLivecad, parseEvents as parseTfsLivecad, SOURCE_NAME as SRC_TFS_LIVECAD } from './sources/tfs-livecad'
import { fetchRaw as fetchTpsCfs, parseEvents as parseTpsCfs, SOURCE_NAME as SRC_TPS_CFS } from './sources/tps-cfs'
import { runEventLifecycle } from './lifecycle'

const JOB_ONTARIO_511          = 'ontario-511'
const JOB_TORONTO_ROAD         = 'toronto-road-restrictions'
const JOB_ENV_CANADA           = 'environment-canada'
const JOB_TPS_MCI              = 'tps-major-crimes'
const JOB_TPS_SHOOTINGS        = 'tps-shootings'
const JOB_TFS_LIVECAD          = 'tfs-livecad'
const JOB_TPS_CFS              = 'tps-cfs'
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

    await Promise.allSettled(events.map((event) => upsertEvent(event)))

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
    case JOB_TPS_MCI:
      await runSource(SRC_MCI, fetchMci, parseMci)
      break
    case JOB_TPS_SHOOTINGS:
      await runSource(SRC_SHOOTINGS, fetchShootings, parseShootings)
      break
    case JOB_TFS_LIVECAD:
      await runSource(SRC_TFS_LIVECAD, fetchTfsLivecad, parseTfsLivecad)
      break
    case JOB_TPS_CFS:
      await runSource(SRC_TPS_CFS, fetchTpsCfs, parseTpsCfs)
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
  const retryOpts = { attempts: 3, backoff: { type: 'exponential' as const, delay: 5_000 } }

  await queue.add(JOB_ONTARIO_511,     {}, { repeat: { every: 2  * 60 * 1000 }, jobId: JOB_ONTARIO_511,     ...retryOpts })
  await queue.add(JOB_TORONTO_ROAD,    {}, { repeat: { every: 15 * 60 * 1000 }, jobId: JOB_TORONTO_ROAD,    ...retryOpts })
  await queue.add(JOB_ENV_CANADA,      {}, { repeat: { every: 10 * 60 * 1000 }, jobId: JOB_ENV_CANADA,      ...retryOpts })
  await queue.add(JOB_TPS_MCI,         {}, { repeat: { every: 60 * 60 * 1000 }, jobId: JOB_TPS_MCI,         ...retryOpts })
  await queue.add(JOB_TPS_SHOOTINGS,   {}, { repeat: { every: 60 * 60 * 1000 }, jobId: JOB_TPS_SHOOTINGS,   ...retryOpts })
  await queue.add(JOB_TFS_LIVECAD,     {}, { repeat: { every:  2 * 60 * 1000 }, jobId: JOB_TFS_LIVECAD,     ...retryOpts })
  await queue.add(JOB_TPS_CFS,         {}, { repeat: { every:  2 * 60 * 1000 }, jobId: JOB_TPS_CFS,         ...retryOpts })
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
    runSource(SRC_MCI, fetchMci, parseMci),
    runSource(SRC_SHOOTINGS, fetchShootings, parseShootings),
    runSource(SRC_TFS_LIVECAD, fetchTfsLivecad, parseTfsLivecad),
    runSource(SRC_TPS_CFS, fetchTpsCfs, parseTpsCfs),
    runEventLifecycle(),
  ])
}
