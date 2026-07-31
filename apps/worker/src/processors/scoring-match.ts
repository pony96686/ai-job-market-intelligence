import type { Job } from 'bullmq';
import { prisma, getJobEmbedding, getProfileEmbedding, upsertProfileEmbedding } from '@ai-job-market-intelligence/db';
import { buildProfileText, generateEmbedding, scoreJob } from '@ai-job-market-intelligence/ai';
import {
  getNotifyEmailQueue,
  NOTIFY_EMAIL_JOB_OPTS,
  type ScoringMatchPayload,
} from '@ai-job-market-intelligence/shared/queue';
import { HIGH_MATCH_SCORE_THRESHOLD } from '@ai-job-market-intelligence/shared/constants';
import { canScore, incrementUsage, canNotify } from '../billing/usage.js';
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

  const result = await scoreJob(profile, jobRecord, { profile: profileEmbedding, job: jobEmbedding });

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

  // High-match notification (Pro users only)
  if (result.decision === 'APPLY' && result.score >= HIGH_MATCH_SCORE_THRESHOLD && (await canNotify(userId))) {
    await getNotifyEmailQueue().add(
      'notify',
      { jobId, userId },
      { ...NOTIFY_EMAIL_JOB_OPTS, jobId: `notify:${jobId}:${userId}` },
    );
  }
}
