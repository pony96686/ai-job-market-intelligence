import { prisma } from '@ai-job-market-intelligence/db';
import { extractTagsAsSkills } from '@ai-job-market-intelligence/ai';

// One-time backfill: extractTagsAsSkills used to store Himalayas' raw
// `tags` (its own job-category taxonomy, e.g. "ai-enablement-engineer") into
// Job.skills verbatim, with zero filtering — now it runs each tag through
// the same skill whitelist every other source's skills go through. This
// re-derives `skills` for already-ingested Himalayas jobs from their
// already-stored `tags`, without re-fetching or re-calling any LLM.
// Run with: pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-himalayas-skills.ts

async function main() {
  const jobs = await prisma.job.findMany({
    where: { source: 'HIMALAYAS' },
    select: { id: true, tags: true, skills: true },
  });

  let updated = 0;
  for (const job of jobs) {
    const skills = extractTagsAsSkills(job.tags);
    const unchanged =
      skills.length === job.skills.length && skills.every((s, i) => s === job.skills[i]);
    if (unchanged) continue;

    await prisma.job.update({ where: { id: job.id }, data: { skills } });
    updated++;
  }

  console.log(`Scanned ${jobs.length} Himalayas jobs, updated skills on ${updated}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
