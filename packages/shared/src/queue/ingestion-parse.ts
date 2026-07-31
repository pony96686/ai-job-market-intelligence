import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../constants/queues';
import { getQueueConnection } from './connection';
import type { NormalizedJob } from '../ingestion/types';

export interface IngestionParsePayload {
  normalized: NormalizedJob;
  companyId: string;
}

// Queue concurrency (3) is what actually bounds the LLM call rate, so
// retry/backoff here just needs to survive transient OpenAI/DB failures.
export const INGESTION_PARSE_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 3000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 100 },
};

let ingestionParseQueue: Queue<IngestionParsePayload> | undefined;

export function getIngestionParseQueue(): Queue<IngestionParsePayload> {
  ingestionParseQueue ??= new Queue(QUEUE_NAMES.INGESTION_PARSE, {
    connection: getQueueConnection(),
  });
  return ingestionParseQueue;
}
