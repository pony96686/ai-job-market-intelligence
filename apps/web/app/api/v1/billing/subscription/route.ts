import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import { SubscriptionResponseSchema } from '@ai-job-market-intelligence/shared';
import { FREE_DAILY_SCORE_LIMIT } from '@ai-job-market-intelligence/shared/constants';
import { startOfDayUTC } from '@ai-job-market-intelligence/shared/utils';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const sub = await prisma.subscription.findUniqueOrThrow({ where: { userId: session.user.id } });

  const today = startOfDayUTC(new Date());
  const usage = await prisma.usageDaily.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
  });

  const isPro = sub.plan === 'PRO' && sub.status === 'ACTIVE';
  const resetsAt = new Date(today);
  resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);

  const data = SubscriptionResponseSchema.parse({
    plan: sub.plan,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    usage: {
      scoresToday: usage?.scoreCount ?? 0,
      scoresLimit: isPro ? null : FREE_DAILY_SCORE_LIMIT,
      resetsAt: resetsAt.toISOString(),
    },
  });

  return apiSuccess(data);
}
