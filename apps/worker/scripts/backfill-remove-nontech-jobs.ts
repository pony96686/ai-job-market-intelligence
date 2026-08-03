import { prisma } from '@ai-job-market-intelligence/db';
import { hasExcludedTag } from '@ai-job-market-intelligence/shared/ingestion';

// One-time backfill: the F6 exclusion filter
// was case-sensitive and missing several category tags (b2b-sales,
// enterprise-sales, business-development, healthcare, medical, radiology),
// so non-tech postings that should never have been ingested slipped into
// the ACTIVE job pool before the fix. Hard-deletes them — JobEmbedding/
// JobScore/Notification all cascade on Job (onDelete: Cascade), so this
// can't leave orphaned rows.
// Run with: pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-remove-nontech-jobs.ts

const HIGH_QUALITY_POOL_THRESHOLD = 10_000;

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, title: true, tags: true },
  });

  const toDelete = jobs.filter((job) => hasExcludedTag(job.tags));
  console.log(
    `Scanned ${jobs.length} ACTIVE jobs, found ${toDelete.length} non-tech postings to remove.`,
  );

  if (toDelete.length > 0) {
    const result = await prisma.job.deleteMany({
      where: { id: { in: toDelete.map((j) => j.id) } },
    });
    console.log(
      `Deleted ${result.count} jobs (embeddings/scores/notifications cascaded automatically).`,
    );
  }

  // The "high quality job pool" bar.
  const remaining = await prisma.job.count({
    where: {
      status: 'ACTIVE',
      OR: [{ parseConfidence: { gte: 0.5 } }, { sourceStructured: true }],
    },
  });
  console.log(`Remaining high-quality ACTIVE job count: ${remaining}`);
  if (remaining < HIGH_QUALITY_POOL_THRESHOLD) {
    console.warn(
      `Below the ${HIGH_QUALITY_POOL_THRESHOLD.toLocaleString()} high-quality job pool threshold — ` +
        'do NOT compensate by loosening the tag filter again; use the ' +
        'dynamic company-scale-up adjustment instead.',
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
