import { prisma } from '@ai-job-market-intelligence/db';
import { stripInjectionText } from '@ai-job-market-intelligence/shared/security';

// One-time backfill: ingestion now strips a suspected prompt-injection
// sentence out of a job's description instead of rejecting the whole
// posting, but jobs ingested before that landed still carry the polluted
// sentence in their stored description. Re-scans existing ACTIVE jobs and
// strips it in place, preserving the rest of each (mostly legitimate)
// posting. Deliberately doesn't touch contentHash — an affected job's next
// real crawl will still see its stored hash differ from a freshly-sanitized
// recompute and do a full re-parse/re-embed on its own, so this script only
// needs to fix the user-visible description text now.
// Run with: pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-strip-injection-text.ts

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, description: true },
  });

  let updated = 0;
  for (const job of jobs) {
    const { cleaned, stripped } = stripInjectionText(job.description);
    if (!stripped) continue;

    await prisma.job.update({ where: { id: job.id }, data: { description: cleaned } });
    updated++;
  }

  console.log(`Scanned ${jobs.length} ACTIVE jobs, sanitized ${updated} description(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
