import { Queue, type JobsOptions } from 'bullmq';
import { QUEUE_NAMES } from '../constants/queues';
import { getQueueConnection } from './connection';

export interface ScoringMatchPayload {
  jobId: string;
  userId: string;
}

export const SCORING_MATCH_JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 200 },
};

let scoringMatchQueue: Queue<ScoringMatchPayload> | undefined;

export function getScoringMatchQueue(): Queue<ScoringMatchPayload> {
  scoringMatchQueue ??= new Queue(QUEUE_NAMES.SCORING_MATCH, {
    connection: getQueueConnection(),
  });
  return scoringMatchQueue;
}

// Pure enqueue operation with no Prisma dependency (packages/shared is not
// allowed to depend on packages/db). The caller (apps/web/lib/queue.ts) is
// responsible for
// querying the jobIds that need rescoring and passing them in.
export async function enqueueRescoringJobs(userId: string, jobIds: string[]): Promise<void> {
  if (jobIds.length === 0) return;

  const queue = getScoringMatchQueue();
  await queue.addBulk(
    jobIds.map((jobId) => ({
      name: 'score',
      data: { jobId, userId },
      opts: { ...SCORING_MATCH_JOB_OPTS, jobId: `score:${jobId}:${userId}` },
    })),
  );
}
