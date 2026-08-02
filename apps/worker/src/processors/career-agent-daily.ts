import type { Job } from 'bullmq';
import { prisma } from '@ai-job-market-intelligence/db';
import {
  getCareerBriefGenerateQueue,
  CAREER_BRIEF_GENERATE_JOB_OPTS,
  type CareerAgentDailyPayload,
} from '@ai-job-market-intelligence/shared/queue';
import { logger } from '../logger.js';

// jobId includes the date so re-running the same day (retry, redeploy) is a
// no-op rather than double-generating that day's brief — same idempotency
// pattern as scoring_match's `score:{jobId}:{userId}`.
function briefJobId(userId: string, date: Date): string {
  return `career-brief:${userId}:${date.toISOString().slice(0, 10)}`;
}

export async function processCareerAgentDaily(job: Job<CareerAgentDailyPayload>): Promise<void> {
  const traceId = job.id!;
  const now = new Date();

  const users = await prisma.user.findMany({
    where: { onboardingCompleted: true, dailyBriefEnabled: true },
    select: { id: true },
  });

  const queue = getCareerBriefGenerateQueue();
  for (const user of users) {
    await queue.add(
      'generate',
      { userId: user.id },
      { ...CAREER_BRIEF_GENERATE_JOB_OPTS, jobId: briefJobId(user.id, now) },
    );
  }

  logger.info({ event: 'career_agent_daily_complete', traceId, usersEnqueued: users.length });
}
