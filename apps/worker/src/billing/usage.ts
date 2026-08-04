import { prisma } from '@ai-job-market-intelligence/db';
import { FREE_DAILY_SCORE_LIMIT } from '@ai-job-market-intelligence/shared/constants';
import { startOfDayUTC } from '@ai-job-market-intelligence/shared/utils';

export async function canScore(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.plan === 'PRO' && sub.status === 'ACTIVE') return true;

  const today = startOfDayUTC(new Date());
  const usage = await prisma.usageDaily.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, scoreCount: 0 },
    update: {},
  });

  return usage.scoreCount < FREE_DAILY_SCORE_LIMIT;
}

// Only called when a job_score is newly created (idempotent updates for the
// same jobId+userId don't count toward usage). Upsert, not update — PRO
// users never go through canScore()'s UsageDaily.upsert (it returns early on
// the plan check), so a PRO user's first score of the day has no row yet.
// scoreCount is still tracked for PRO users (not just quota enforcement):
// GET /api/v1/billing/subscription reads it back as `usage.scoresToday`
// regardless of plan.
export async function incrementUsage(userId: string): Promise<void> {
  const today = startOfDayUTC(new Date());
  await prisma.usageDaily.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, scoreCount: 1 },
    update: { scoreCount: { increment: 1 } },
  });
}

// Only Pro users trigger email notifications
export async function canNotify(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return sub?.plan === 'PRO' && sub.status === 'ACTIVE';
}
