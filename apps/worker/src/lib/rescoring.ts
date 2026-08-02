import { prisma } from '@ai-job-market-intelligence/db';
import { enqueueRescoringJobs } from '@ai-job-market-intelligence/shared/queue';
import { CURRENT_SCORING_VERSION } from '@ai-job-market-intelligence/shared/constants';

// Mirrors apps/web/lib/queue.ts's enqueueRescoring — duplicated rather than
// shared because packages/shared cannot depend on packages/db, so each app
// owns its own copy of this Prisma-backed query.
//
// Resume/GitHub parsing only ever completes for a user whose UserProfile
// already exists (onboardingCompleted was already flipped true by the
// initial PUT /users/me/profile submission before this async job runs), so
// this is always the "existing user updated their profile" case from
// ai-scoring.md §7.1 — never the "new user onboarding" case, which is
// handled separately in apps/web/lib/queue.ts.
export async function enqueueRescoring(userId: string): Promise<void> {
  const jobs = await prisma.job.findMany({
    where: {
      OR: [
        { scores: { none: { userId } } },
        { scores: { some: { userId, scoringVersion: { not: CURRENT_SCORING_VERSION } } } },
      ],
    },
    select: { id: true },
  });

  await enqueueRescoringJobs(
    userId,
    jobs.map((j) => j.id),
  );
}
