import { prisma } from '@ai-job-market-intelligence/db';
import { hasExcludedTitleKeyword } from '@ai-job-market-intelligence/shared/ingestion';

// One-time backfill: F6 only ever checked job.tags, but Greenhouse/Lever/
// Ashby never provide native tags (normalize() always leaves that array
// empty for them), so F6 has been a no-op for these three sources since day
// one. Re-checks already-ingested ACTIVE jobs from those sources against the
// new title-keyword rule and hard-deletes matches (JobEmbedding/JobScore/
// Notification all cascade on Job, same as the earlier tag-based backfill).
//
// Defaults to a dry run (prints the count, deletes nothing) — set
// EXECUTE=true to actually delete, per the recommendation to see the hit
// count before committing to it.
// Run with:
//   pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-remove-nontech-titles.ts
//   EXECUTE=true pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-remove-nontech-titles.ts

const TARGET_SOURCES = ['GREENHOUSE', 'LEVER', 'ASHBY'] as const;

async function main() {
  const jobs = await prisma.job.findMany({
    where: { source: { in: TARGET_SOURCES }, status: 'ACTIVE' },
    select: { id: true, title: true, source: true },
  });

  const toDelete = jobs.filter((job) => hasExcludedTitleKeyword(job.title));

  console.log(`Scanned ${jobs.length} ACTIVE Greenhouse/Lever/Ashby jobs.`);
  const bySource = new Map<string, number>();
  for (const job of toDelete) {
    bySource.set(job.source, (bySource.get(job.source) ?? 0) + 1);
  }
  console.log(`Found ${toDelete.length} non-tech postings to remove:`);
  for (const [source, count] of bySource) {
    console.log(`  ${source}: ${count}`);
  }

  if (process.env.EXECUTE !== 'true') {
    console.log('\nDry run only — set EXECUTE=true to actually delete these jobs.');
    return;
  }

  if (toDelete.length > 0) {
    const result = await prisma.job.deleteMany({
      where: { id: { in: toDelete.map((j) => j.id) } },
    });
    console.log(
      `Deleted ${result.count} jobs (embeddings/scores/notifications cascaded automatically).`,
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
