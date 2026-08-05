import { prisma } from './client';
import {
  FREE_DAILY_CAREER_COACH_MESSAGE_LIMIT,
  PRO_DAILY_CAREER_COACH_MESSAGE_LIMIT,
} from '@ai-job-market-intelligence/shared/constants';
import { startOfDayUTC } from '@ai-job-market-intelligence/shared/utils';

// Unlike scoring's canScore() (apps/worker/src/billing/usage.ts), this
// always upserts the UsageDaily row regardless of plan — a PRO user's row
// needs to exist too so incrementCareerCoachUsage below never hits the
// missing-row P2025 case that canScore's early-return once caused there.
export async function canSendCareerCoachMessage(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const limit =
    sub?.plan === 'PRO' && sub.status === 'ACTIVE'
      ? PRO_DAILY_CAREER_COACH_MESSAGE_LIMIT
      : FREE_DAILY_CAREER_COACH_MESSAGE_LIMIT;

  const today = startOfDayUTC(new Date());
  const usage = await prisma.usageDaily.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, careerCoachMessageCount: 0 },
    update: {},
  });

  return usage.careerCoachMessageCount < limit;
}

// Counts only the user's own sent messages, never the agent's replies — the
// caller must have already confirmed canSendCareerCoachMessage() this same
// request before calling this.
export async function incrementCareerCoachUsage(userId: string): Promise<void> {
  const today = startOfDayUTC(new Date());
  await prisma.usageDaily.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, careerCoachMessageCount: 1 },
    update: { careerCoachMessageCount: { increment: 1 } },
  });
}
