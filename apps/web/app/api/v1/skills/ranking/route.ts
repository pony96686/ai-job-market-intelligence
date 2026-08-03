import { prisma } from '@ai-job-market-intelligence/db';
import {
  SkillRankingQuerySchema,
  SkillRankingItemSchema,
} from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

// Public — market-wide data, not user-specific.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = SkillRankingQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }
  const { windowDays, sort, limit } = parsed.data;

  const latest = await prisma.skillTrendSnapshot.findFirst({
    where: { windowDays },
    orderBy: { periodEnd: 'desc' },
    select: { periodEnd: true },
  });
  if (!latest) {
    return apiSuccess([]);
  }

  const snapshots = await prisma.skillTrendSnapshot.findMany({
    where: {
      windowDays,
      periodEnd: latest.periodEnd,
      // growing/declining need a real growthPercent — skills where it's
      // still null (not enough data yet) are filtered out rather than
      // shown with a misleading value.
      ...(sort !== 'count' && { growthPercent: { not: null } }),
    },
    include: { skill: true },
    orderBy:
      sort === 'count'
        ? { jobCount: 'desc' }
        : { growthPercent: sort === 'growing' ? 'desc' : 'asc' },
    take: limit,
  });

  const data = snapshots.map((s) =>
    SkillRankingItemSchema.parse({
      slug: s.skill.slug,
      name: s.skill.name,
      jobCount: s.jobCount,
      growthPercent: s.growthPercent,
    }),
  );

  return apiSuccess(data);
}
