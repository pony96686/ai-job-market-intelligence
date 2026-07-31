import { prisma } from '@ai-job-market-intelligence/db';
import { enqueueRescoringJobs } from '@ai-job-market-intelligence/shared/queue';

const RESCORING_WINDOW_DAYS = 7;

// Mirrors apps/web/lib/queue.ts's enqueueRescoring — duplicated rather than
// shared because packages/shared cannot depend on packages/db, so each app
// owns its own copy of this Prisma-backed query.
export async function enqueueRescoring(userId: string): Promise<void> {
  const since = new Date(Date.now() - RESCORING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const jobs = await prisma.job.findMany({
    where: { createdAt: { gte: since } },
    select: { id: true },
  });

  await enqueueRescoringJobs(
    userId,
    jobs.map((j) => j.id),
  );
}
