import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../constants/queues';
import { getQueueConnection } from './connection';
import type { AtsSource } from '../schemas/ats-company';

// Common Crawl Index Discovery is the sole mechanism — one job per "per
// company" ATS, no method/queryVariant dimension needed.
export interface CompanyDiscoveryPayload {
  source: AtsSource;
}

// Discovery is a slow-changing weekly job, exponential backoff here just
// needs to survive a transient Common Crawl / probe outage.
export const COMPANY_DISCOVERY_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { count: 20 },
  removeOnFail: { count: 20 },
};

let companyDiscoveryQueue: Queue<CompanyDiscoveryPayload> | undefined;

export function getCompanyDiscoveryQueue(): Queue<CompanyDiscoveryPayload> {
  companyDiscoveryQueue ??= new Queue(QUEUE_NAMES.COMPANY_DISCOVERY, {
    connection: getQueueConnection(),
  });
  return companyDiscoveryQueue;
}
