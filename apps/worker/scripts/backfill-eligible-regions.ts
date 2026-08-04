import { prisma } from '@ai-job-market-intelligence/db';
import { inferEligibleRegionsFromText } from '@ai-job-market-intelligence/shared/regions';

// One-time backfill: eligibleRegions was previously either hardcoded empty
// (Himalayas' sourceStructured path never looked at the description at all)
// or missed by the LLM despite an explicit restriction being present in the
// text. Both paths now run inferEligibleRegionsFromText() as a supplement —
// this re-derives eligibleRegions for already-ingested jobs whose value is
// still empty, without re-calling any LLM.
//
// Defaults to a dry run (prints the count, updates nothing) — set
// EXECUTE=true to actually write the changes.
// Run with:
//   pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-eligible-regions.ts
//   EXECUTE=true pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-eligible-regions.ts

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: 'ACTIVE', parseConfidence: { gt: 0.5 }, eligibleRegions: { equals: [] } },
    select: { id: true, title: true, description: true, source: true },
  });

  const toUpdate = jobs
    .map((job) => ({
      job,
      regions: inferEligibleRegionsFromText(`${job.title} ${job.description}`),
    }))
    .filter(({ regions }) => regions.length > 0);

  console.log(`Scanned ${jobs.length} ACTIVE jobs with empty eligibleRegions.`);
  const bySource = new Map<string, number>();
  for (const { job } of toUpdate) {
    bySource.set(job.source, (bySource.get(job.source) ?? 0) + 1);
  }
  console.log(`Found ${toUpdate.length} with a detectable restriction in their text:`);
  for (const [source, count] of bySource) {
    console.log(`  ${source}: ${count}`);
  }

  if (process.env.EXECUTE !== 'true') {
    console.log('\nDry run only — set EXECUTE=true to actually write these updates.');
    return;
  }

  for (const { job, regions } of toUpdate) {
    await prisma.job.update({ where: { id: job.id }, data: { eligibleRegions: regions } });
  }
  console.log(`Updated eligibleRegions on ${toUpdate.length} jobs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
