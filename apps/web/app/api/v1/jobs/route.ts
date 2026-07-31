import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import { JobListQuerySchema, JobListItemSchema } from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const { searchParams } = new URL(request.url);
  const parsed = JobListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }
  const { page, pageSize, decision, minScore, sort } = parsed.data;

  const where = {
    userId: session.user.id,
    // CLOSED postings are excluded from the list by default but not deleted
    // (still reachable directly via /jobs/[id]).
    job: { status: 'ACTIVE' as const },
    ...(decision && { decision }),
    ...(minScore !== undefined && { score: { gte: minScore } }),
  };

  const [scores, total] = await Promise.all([
    prisma.jobScore.findMany({
      where,
      include: { job: true },
      orderBy: sort === 'date' ? { job: { postedAt: 'desc' as const } } : { score: 'desc' as const },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.jobScore.count({ where }),
  ]);

  const data = scores.map((s) =>
    JobListItemSchema.parse({
      id: s.job.id,
      title: s.job.title,
      company: s.job.company,
      source: s.job.source,
      role: s.job.role,
      level: s.job.level,
      location: s.job.location,
      url: s.job.url,
      tags: s.job.tags,
      postedAt: s.job.postedAt?.toISOString() ?? null,
      score: {
        value: s.score,
        decision: s.decision,
        reasoning: s.reasoning,
        strengths: s.strengths,
        skillGap: s.skillGap,
      },
    }),
  );

  return apiSuccess(data, {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
