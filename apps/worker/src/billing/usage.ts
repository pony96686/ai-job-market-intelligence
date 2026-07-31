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
// same jobId+userId don't count toward usage)
export async function incrementUsage(userId: string): Promise<void> {
  const today = startOfDayUTC(new Date());
  await prisma.usageDaily.update({
    where: { userId_date: { userId, date: today } },
    data: { scoreCount: { increment: 1 } },
  });
}

// Only Pro users trigger email notifications
export async function canNotify(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  return sub?.plan === 'PRO' && sub.status === 'ACTIVE';
}
