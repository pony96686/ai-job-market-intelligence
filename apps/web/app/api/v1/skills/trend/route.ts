import { prisma } from '@ai-job-market-intelligence/db';
import {
  SkillTrendQuerySchema,
  SkillTrendResponseSchema,
} from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

// Snapshots are kept indefinitely — cap how much
// history a single response returns so it doesn't grow unbounded forever.
const MAX_SERIES_POINTS = 180;

// Public — market-wide data, not user-specific.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = SkillTrendQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }
  const { skill: slug, windowDays } = parsed.data;

  const skill = await prisma.skill.findUnique({ where: { slug } });
  if (!skill) {
    return apiError('NOT_FOUND', 404);
  }

  const snapshots = await prisma.skillTrendSnapshot.findMany({
    where: { skillId: skill.id, windowDays },
    orderBy: { periodEnd: 'desc' },
    take: MAX_SERIES_POINTS,
  });

  const data = SkillTrendResponseSchema.parse({
    slug: skill.slug,
    name: skill.name,
    windowDays,
    series: snapshots
      .slice()
      .reverse() // oldest -> newest for charting
      .map((s) => ({
        periodEnd: s.periodEnd.toISOString(),
        jobCount: s.jobCount,
        growthPercent: s.growthPercent,
      })),
  });

  return apiSuccess(data);
}
