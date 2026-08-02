import { prisma, upsertCompany } from '@ai-job-market-intelligence/db';

// One-time backfill for a Himalayas API defect: companyName came back as the
// literal sentinel string "name" for a subset of postings (see
// packages/shared/src/ingestion/adapters/himalayas.ts's resolveCompanyName
// for the now-fixed ingestion-time guard against this). Jobs ingested before
// that fix landed still have company="name", all incorrectly collapsed onto
// a single bogus Company row. The job's own url encodes the real company
// slug (https://himalayas.app/companies/{slug}/jobs/...), so re-derive the
// correct name from there instead of re-fetching from the API.
// Run with: pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-himalayas-company-names.ts

const BROKEN_COMPANY_NAME = 'name';
const COMPANY_SLUG_FROM_URL = /\/companies\/([^/]+)\/jobs\//;

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

async function main() {
  const brokenJobs = await prisma.job.findMany({
    where: { company: BROKEN_COMPANY_NAME, source: 'HIMALAYAS' },
    select: { id: true, url: true, companyId: true },
  });

  console.log(`Found ${brokenJobs.length} jobs with company="${BROKEN_COMPANY_NAME}".`);

  let fixed = 0;
  let skipped = 0;
  const touchedCompanyIds = new Set<string>();

  for (const job of brokenJobs) {
    const match = job.url.match(COMPANY_SLUG_FROM_URL);
    if (!match) {
      skipped++;
      console.warn(`Could not extract company slug from URL: ${job.url}`);
      continue;
    }

    const companyName = humanizeSlug(match[1]!);
    const company = await upsertCompany(companyName);

    await prisma.job.update({
      where: { id: job.id },
      data: { company: companyName, companyId: company.id },
    });

    if (job.companyId) touchedCompanyIds.add(job.companyId);
    fixed++;
  }

  console.log(`Fixed ${fixed}, skipped ${skipped}.`);

  for (const companyId of touchedCompanyIds) {
    const remaining = await prisma.job.count({ where: { companyId } });
    if (remaining > 0) {
      console.warn(
        `Company ${companyId} still has ${remaining} job(s) pointing at it, not deleting.`,
      );
      continue;
    }
    const deleted = await prisma.company.delete({ where: { id: companyId } }).catch(() => null);
    if (deleted) console.log(`Deleted orphaned bogus company row: ${deleted.slug}`);
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
