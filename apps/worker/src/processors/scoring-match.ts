import type { Job } from 'bullmq';
import {
  prisma,
  getJobEmbedding,
  getProfileEmbedding,
  upsertProfileEmbedding,
} from '@ai-job-market-intelligence/db';
import { buildProfileText, generateEmbedding, scoreJob } from '@ai-job-market-intelligence/ai';
import type { ScoringMatchPayload } from '@ai-job-market-intelligence/shared/queue';
import { canScore, incrementUsage } from '../billing/usage.js';
import { logger } from '../logger.js';

export async function processScoringMatch(job: Job<ScoringMatchPayload>): Promise<void> {
  const { jobId, userId } = job.data;
  const traceId = job.id!;

  const allowed = await canScore(userId);
  if (!allowed) {
    logger.warn({ event: 'scoring_quota_exceeded', userId, jobId, traceId });
    return;
  }

  const [profile, jobRecord, jobEmbedding] = await Promise.all([
    prisma.userProfile.findUniqueOrThrow({ where: { userId } }),
    prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
    getJobEmbedding(jobId),
  ]);

  if (!jobEmbedding) {
    throw new Error(`Job ${jobId} has no embedding yet`);
  }

  let profileEmbedding = await getProfileEmbedding(userId);
  if (!profileEmbedding) {
    const profileText = buildProfileText(profile);
    profileEmbedding = await generateEmbedding(profileText);
    await upsertProfileEmbedding(userId, profileEmbedding);
  }

  const result = await scoreJob(profile, jobRecord, {
    profile: profileEmbedding,
    job: jobEmbedding,
  });

  const existingScore = await prisma.jobScore.findUnique({
    where: { jobId_userId: { jobId, userId } },
  });

  await prisma.jobScore.upsert({
    where: { jobId_userId: { jobId, userId } },
    create: { jobId, userId, ...result },
    update: { ...result, updatedAt: new Date() },
  });

  if (!existingScore) {
    await incrementUsage(userId);
  }

  logger.info({
    event: 'scoring_complete',
    jobId,
    userId,
    score: result.score,
    decision: result.decision,
    traceId,
  });

  // Instant high-match email (score >= 80 + APPLY) is retired — high-match
  // jobs now surface via Opportunity Discovery in the next day's Career
  // Brief instead.
}
