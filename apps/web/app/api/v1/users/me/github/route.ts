import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';
import { prisma } from '@ai-job-market-intelligence/db';
import { GithubLinkSchema } from '@ai-job-market-intelligence/shared';
import { enqueueProfileParse } from '@ai-job-market-intelligence/shared/queue';

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = GithubLinkSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }

  // Set PENDING synchronously (upsert, may create the row) before enqueue so
  // the frontend can show a "processing" state immediately.
  await prisma.careerProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, githubUsername: parsed.data.username, githubParseStatus: 'PENDING' },
    update: { githubUsername: parsed.data.username, githubParseStatus: 'PENDING' },
  });

  await enqueueProfileParse({
    userId: session.user.id,
    source: 'github',
    githubUsername: parsed.data.username,
  });

  return apiSuccess({ message: 'GitHub linked, parsing in progress' });
}
