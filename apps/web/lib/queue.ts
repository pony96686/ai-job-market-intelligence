import { prisma } from '@ai-job-market-intelligence/db';
import { enqueueRescoringJobs } from '@ai-job-market-intelligence/shared/queue';

const RESCORING_WINDOW_DAYS = 7;

// Bulk rescoring after a profile update — only re-enqueues jobs ingested in
// the last 7 days, not the entire job table (avoids recomputing the whole
// historical backlog).
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
