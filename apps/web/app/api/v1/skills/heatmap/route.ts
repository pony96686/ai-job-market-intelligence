import { prisma } from '@ai-job-market-intelligence/db';
import { normalizeSkill } from '@ai-job-market-intelligence/shared/skills';
import {
  SkillHeatmapQuerySchema,
  SkillHeatmapResponseSchema,
} from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

// Computed live from jobs.skills rather than pre-aggregated like
// ranking/trend — role is an open-ended filter (not one of a fixed small
// set), so pre-computing a snapshot for every possible role isn't practical.
const MAX_HEATMAP_SKILLS = 20;

// Public — market-wide data, not user-specific.
// One role per call — the frontend calls this once per role in a fixed
// list and assembles the skill x role matrix client-side.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = SkillHeatmapQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }
  const { role } = parsed.data;

  const jobs = await prisma.job.findMany({
    where: {
      status: 'ACTIVE',
      skills: { isEmpty: false },
      role: { contains: role, mode: 'insensitive' },
    },
    select: { skills: true },
  });

  const counts = new Map<string, { count: number; name: string }>();
  for (const job of jobs) {
    // Dedupe within a single job so synonym variants of the same skill
    // don't double-count, matching packages/ai's computeSkillTrendSnapshots.
    const seen = new Set<string>();
    for (const raw of job.skills) {
      for (const normalized of normalizeSkill(raw)) {
        if (seen.has(normalized.slug)) continue;
        seen.add(normalized.slug);
        const entry = counts.get(normalized.slug);
        counts.set(normalized.slug, { count: (entry?.count ?? 0) + 1, name: normalized.name });
      }
    }
  }

  const skills = [...counts.entries()]
    .map(([slug, { count, name }]) => ({ slug, name, jobCount: count }))
    .sort((a, b) => b.jobCount - a.jobCount)
    .slice(0, MAX_HEATMAP_SKILLS);

  const data = SkillHeatmapResponseSchema.parse({ role, skills });
  return apiSuccess(data);
}
