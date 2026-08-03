import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../constants/queues';
import { getQueueConnection } from './connection';

// Whole-table sweep triggered by cron — fans out one career_brief_generate
// job per eligible user, no per-run parameters needed.
export type CareerAgentDailyPayload = Record<string, never>;

export const CAREER_AGENT_DAILY_JOB_OPTS: JobsOptions = {
  attempts: 2,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: { count: 10 },
  removeOnFail: { count: 10 },
};

let careerAgentDailyQueue: Queue<CareerAgentDailyPayload> | undefined;

export function getCareerAgentDailyQueue(): Queue<CareerAgentDailyPayload> {
  careerAgentDailyQueue ??= new Queue(QUEUE_NAMES.CAREER_AGENT_DAILY, {
    connection: getQueueConnection(),
  });
  return careerAgentDailyQueue;
}
