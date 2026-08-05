import { prisma } from '@ai-job-market-intelligence/db';
import { stripHtml } from '@ai-job-market-intelligence/shared/utils';

// One-time backfill: every adapter has always called stripHtml on ingest,
// but that fix didn't reach production master until a later develop->master
// sync — jobs ingested before then still carry raw, unconverted HTML in
// their stored description (literal <div>/<p>/<li> tags visible on the job
// detail page). Re-scans existing ACTIVE jobs, detects ones that still look
// like HTML, and re-strips the already-stored value in place — no
// re-fetching needed, since the raw HTML is still sitting in the column.
// Deliberately doesn't touch contentHash — same reasoning as
// backfill-strip-injection-text.ts: an affected job's next real crawl will
// still see its stored hash differ from a freshly-computed one and do a
// full re-parse/re-embed on its own.
// Run with:
//   pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-strip-html-descriptions.ts

const LOOKS_LIKE_HTML = /<[a-z][\s\S]*?>/i;
const PROGRESS_INTERVAL = 500;

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, description: true },
  });

  let updated = 0;
  let scanned = 0;

  for (const job of jobs) {
    scanned++;
    if (LOOKS_LIKE_HTML.test(job.description)) {
      const cleaned = stripHtml(job.description);
      if (cleaned && cleaned !== job.description) {
        await prisma.job.update({ where: { id: job.id }, data: { description: cleaned } });
        updated++;
      }
    }

    if (scanned % PROGRESS_INTERVAL === 0) {
      console.log(`Progress: ${scanned}/${jobs.length} scanned, ${updated} descriptions cleaned`);
    }
  }

  console.log(`Scanned ${jobs.length} ACTIVE jobs, cleaned ${updated} description(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
