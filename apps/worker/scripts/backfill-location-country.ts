import { prisma } from '@ai-job-market-intelligence/db';
import {
  extractLocationCountry,
  mapLocationRestrictionsToRegionBuckets,
} from '@ai-job-market-intelligence/shared/regions';

// One-time backfill: locationCountry is a brand new field with no
// historical data, and Himalayas jobs never had eligibleRegions derived
// from their native locationRestrictions field (previously discarded after
// being flattened into `location` — see himalayas.ts). Pure deterministic
// string matching, no LLM calls, no deletions — safe to run against the
// full table in one pass, no dry run needed.
// Run with:
//   pnpm --filter @ai-job-market-intelligence/worker exec tsx scripts/backfill-location-country.ts

async function main() {
  const jobs = await prisma.job.findMany({
    select: { id: true, source: true, location: true, eligibleRegions: true },
  });

  let locationCountryUpdated = 0;
  let eligibleRegionsUpdated = 0;

  for (const job of jobs) {
    const locationCountry = extractLocationCountry(job.location);
    const data: { locationCountry?: string; eligibleRegions?: string[] } = {};

    if (locationCountry) {
      data.locationCountry = locationCountry;
    }

    if (job.source === 'HIMALAYAS') {
      // `location` was originally `locationRestrictions.join(', ')` (see
      // himalayas.ts's normalize()) — splitting it back approximates the
      // original array well enough for this one-time pass.
      const restrictions = job.location === 'Remote' ? [] : job.location.split(', ');
      const eligibleRegions = mapLocationRestrictionsToRegionBuckets(restrictions);
      if (
        eligibleRegions.length > 0 &&
        eligibleRegions.slice().sort().join(',') !== job.eligibleRegions.slice().sort().join(',')
      ) {
        data.eligibleRegions = eligibleRegions;
      }
    }

    if (Object.keys(data).length === 0) continue;

    await prisma.job.update({ where: { id: job.id }, data });
    if (data.locationCountry) locationCountryUpdated++;
    if (data.eligibleRegions) eligibleRegionsUpdated++;
  }

  console.log(`Scanned ${jobs.length} jobs.`);
  console.log(`Set locationCountry on ${locationCountryUpdated} jobs.`);
  console.log(`Updated Himalayas eligibleRegions on ${eligibleRegionsUpdated} jobs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
