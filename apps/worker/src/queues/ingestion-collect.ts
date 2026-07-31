import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@ai-job-market-intelligence/shared/constants';
import { adapters } from '@ai-job-market-intelligence/shared/ingestion';
import { connection } from '../redis.js';

export interface IngestionCollectPayload {
  source: string;
  // Only set for GREENHOUSE/LEVER/ASHBY sub-tasks — absent means "batch
  // trigger" for those sources, or "the whole source" for RemoteOK/Himalayas.
  companySlug?: string;
}

let ingestionCollectQueue: Queue<IngestionCollectPayload> | undefined;

export function getIngestionCollectQueue(): Queue<IngestionCollectPayload> {
  ingestionCollectQueue ??= new Queue(QUEUE_NAMES.INGESTION_COLLECT, { connection });
  return ingestionCollectQueue;
}

const PER_COMPANY_SOURCES = ['GREENHOUSE', 'LEVER', 'ASHBY'];

// Himalayas' data only refreshes every 24h upstream — polling it every
// 30min like the others would waste requests for no new data.
function cronPatternFor(source: string): string {
  return source === 'HIMALAYAS' ? '0 3 * * *' : '*/30 * * * *';
}

// Each adapter is scheduled and runs independently — one source failing
// MUST NOT block the others.
export async function scheduleIngestionCollectCron(): Promise<void> {
  const queue = getIngestionCollectQueue();
  const aggregatorAdapters = adapters.filter((adapter) => !PER_COMPANY_SOURCES.includes(adapter.source));

  await Promise.all([
    ...aggregatorAdapters.map((adapter) =>
      queue.add(
        'collect',
        { source: adapter.source },
        {
          repeat: { pattern: cronPatternFor(adapter.source), immediately: true },
          jobId: `ingestion-collect-cron:${adapter.source}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      ),
    ),
    // Per-company sources get a fixed "batch trigger" job — it fans out one
    // sub-task per ats_companies row hit by this cycle's cadence_bucket (see
    // processIngestionCollect's processBatchTrigger).
    ...PER_COMPANY_SOURCES.map((source) =>
      queue.add(
        'collect-batch-trigger',
        { source },
        {
          repeat: { pattern: '*/30 * * * *', immediately: true },
          jobId: `ingestion-collect-batch:${source}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      ),
    ),
  ]);
}
