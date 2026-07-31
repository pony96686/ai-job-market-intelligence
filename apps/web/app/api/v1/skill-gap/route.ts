import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import { SkillGapQuerySchema, SkillGapResponseSchema } from '@ai-job-market-intelligence/shared';
import { topFrequentSkills, computeSkillGap } from '@ai-job-market-intelligence/ai';
import { apiSuccess, apiError } from '@/lib/api-response';

// Below this many same-role postings, the required-skill set is too noisy
// to be a reliable target — the response still returns a best-effort
// result, flagged with lowConfidence: true.
const MIN_RELIABLE_SAMPLE_SIZE = 10;
const SIMILAR_JOBS_LIMIT = 50;
const REQUIRED_SKILLS_LIMIT = 15;

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const { searchParams } = new URL(request.url);
  const parsed = SkillGapQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 400, parsed.error.issues);
  }
  const { targetRole } = parsed.data;

  const [profile, similarJobs] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.job.findMany({
      where: { role: { equals: targetRole, mode: 'insensitive' } },
      select: { tags: true },
      orderBy: { createdAt: 'desc' },
      take: SIMILAR_JOBS_LIMIT,
    }),
  ]);

  if (!profile) {
    return apiError('PROFILE_INCOMPLETE', 400);
  }

  const requiredSkills = topFrequentSkills(
    similarJobs.map((j) => j.tags),
    REQUIRED_SKILLS_LIMIT,
  );
  const { matchPercent, missingSkills } = computeSkillGap(requiredSkills, profile.skills);

  const data = SkillGapResponseSchema.parse({
    targetRole,
    matchPercent,
    missingSkills,
    sampleSize: similarJobs.length,
    lowConfidence: similarJobs.length < MIN_RELIABLE_SAMPLE_SIZE,
    hasSkillData: requiredSkills.length > 0,
  });

  return apiSuccess(data);
}
