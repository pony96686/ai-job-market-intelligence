import { prisma } from '@ai-job-market-intelligence/db';
import { parseJobFields, extractTagsAsSkills } from '@ai-job-market-intelligence/ai';

// One-time backfill: jobs ingested before
// `jobs.skills` was persisted have skills=[] even though AI Job Parsing (or
// extractTagsAsSkills for sourceStructured sources) already produced a real
// skill list at ingestion time — recompute and UPDATE only that column.
// Run with: pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-job-skills.ts

async function main() {
  const jobs = await prisma.job.findMany({
    where: { status: 'ACTIVE', skills: { equals: [] } },
    select: { id: true, title: true, description: true, tags: true, sourceStructured: true },
  });

  console.log(`Found ${jobs.length} ACTIVE jobs with empty skills.`);

  let updated = 0;
  let failed = 0;

  for (const [i, job] of jobs.entries()) {
    try {
      const skills = job.sourceStructured
        ? extractTagsAsSkills(job.tags)
        : (await parseJobFields({ title: job.title, description: job.description, tags: job.tags }))
            .skills;

      if (skills.length > 0) {
        await prisma.job.update({ where: { id: job.id }, data: { skills } });
        updated++;
      }
    } catch (error) {
      failed++;
      console.error(`Failed to backfill job ${job.id}:`, error);
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${jobs.length}`);
    }
  }

  console.log(`Done. Updated ${updated}, failed ${failed}, out of ${jobs.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
