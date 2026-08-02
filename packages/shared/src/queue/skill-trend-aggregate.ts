import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../constants/queues';
import { getQueueConnection } from './connection';

// Whole-table sweep triggered by cron — no per-run parameters needed. The
// aggregation date is always "now" at processing time, not something passed
// in through job data (repeatable jobs reuse the same data template on every
// run, so a timestamp captured at registration time would go stale).
export type SkillTrendAggregatePayload = Record<string, never>;

export const SKILL_TREND_AGGREGATE_JOB_OPTS: JobsOptions = {
  attempts: 2,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: { count: 10 },
  removeOnFail: { count: 10 },
};

let skillTrendAggregateQueue: Queue<SkillTrendAggregatePayload> | undefined;

export function getSkillTrendAggregateQueue(): Queue<SkillTrendAggregatePayload> {
  skillTrendAggregateQueue ??= new Queue(QUEUE_NAMES.SKILL_TREND_AGGREGATE, {
    connection: getQueueConnection(),
  });
  return skillTrendAggregateQueue;
}
