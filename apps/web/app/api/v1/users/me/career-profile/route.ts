import { auth } from '@/lib/auth';
import { prisma } from '@ai-job-market-intelligence/db';
import { CareerProfileResponseSchema } from '@ai-job-market-intelligence/shared';
import { apiSuccess, apiError } from '@/lib/api-response';

// A career_profiles row not existing at all is a legitimate empty state
// (never uploaded/linked), not a 404 — every field just reports status: null.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 401);
  }

  const careerProfile = await prisma.careerProfile.findUnique({ where: { userId: session.user.id } });

  const data = CareerProfileResponseSchema.parse({
    resume: {
      status: careerProfile?.resumeParseStatus ?? null,
      skills: careerProfile?.resumeSkills ?? [],
      experienceYears: careerProfile?.resumeExperienceYears ?? null,
      summary: careerProfile?.resumeSummary ?? null,
      parsedAt: careerProfile?.resumeParsedAt?.toISOString() ?? null,
    },
    github: {
      status: careerProfile?.githubParseStatus ?? null,
      username: careerProfile?.githubUsername ?? null,
      languages: (careerProfile?.githubLanguages as Record<string, number> | null) ?? null,
      summary: careerProfile?.githubSummary ?? null,
      parsedAt: careerProfile?.githubParsedAt?.toISOString() ?? null,
    },
  });

  return apiSuccess(data);
}
