import { prisma } from '@ai-job-market-intelligence/db';
import { enqueueRescoringJobs } from '@ai-job-market-intelligence/shared/queue';
import { CURRENT_SCORING_VERSION } from '@ai-job-market-intelligence/shared/constants';

const RESCORING_WINDOW_DAYS = 7;

// ai-scoring.md §7.1 distinguishes two triggers with different criteria:
// a brand-new user completing onboarding gets only the last 7 days of jobs
// (scoring their entire historical backlog on day one would be wasteful and
// slow), while an existing user updating their profile gets every job that
// has no score yet or was scored with an older algorithm version — no time
// bound, since a real preference change should be reflected everywhere.
export async function enqueueRescoring(userId: string, isNewOnboarding: boolean): Promise<void> {
  const jobs = isNewOnboarding
    ? await prisma.job.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - RESCORING_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      })
    : await prisma.job.findMany({
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
