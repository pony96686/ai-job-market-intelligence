import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import {
  CareerBriefResponseSchema,
  CareerBriefSummarySchema,
} from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const brief = await prisma.careerBrief.findFirst({
    where: { userId: session.user.id },
    orderBy: { briefDate: 'desc' },
  });

  if (!brief) {
    return apiError('NOT_FOUND', 404);
  }

  const data = CareerBriefResponseSchema.parse({
    briefDate: brief.briefDate.toISOString().slice(0, 10),
    summary: CareerBriefSummarySchema.parse(brief.summary),
  });

  return apiSuccess(data);
}
