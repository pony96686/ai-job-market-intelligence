import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import {
  NotificationSettingsUpdateSchema,
  NotificationSettingsResponseSchema,
} from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });

  return apiSuccess(
    NotificationSettingsResponseSchema.parse({ dailyBriefEnabled: user.dailyBriefEnabled }),
  );
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = NotificationSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { dailyBriefEnabled: parsed.data.dailyBriefEnabled },
  });

  return apiSuccess(
    NotificationSettingsResponseSchema.parse({ dailyBriefEnabled: user.dailyBriefEnabled }),
  );
}
