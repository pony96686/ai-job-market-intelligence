import type { Job } from 'bullmq';
import { prisma } from '@ai-job-market-intelligence/db';
import { commonCrawlDiscovery, probeOfficialApi, hashToBucket } from '@ai-job-market-intelligence/shared/ingestion';
import type { CompanyDiscoveryPayload } from '@ai-job-market-intelligence/shared/queue';
import { logger } from '../logger.js';

const DEFAULT_TARGET_COMPANY_COUNT = 1500;

// Discovers candidate ATS company slugs via Common Crawl Index Discovery
// (zero-config, free — no API key or operator-supplied domain list needed),
// validates each against the ATS's own official API, and upserts
// ats_companies. This queue only registers companies — it never fetches job
// data itself (that's ingestion_collect's job, see processIngestionCollect).
export async function processCompanyDiscovery(job: Job<CompanyDiscoveryPayload>): Promise<void> {
  const { source } = job.data;
  const traceId = job.id!;

  const candidates = await commonCrawlDiscovery(source);

  const targetCount = Number(process.env.COMPANY_DISCOVERY_TARGET_COMPANY_COUNT ?? DEFAULT_TARGET_COMPANY_COUNT);
  const activeCount = await prisma.atsCompany.count({ where: { status: 'ACTIVE' } });
  // Once the scale target is reached, stop registering brand-new companies
  // but keep re-validating existing ones (they may later flip to INACTIVE
  // and need replacing).
  const targetReached = activeCount >= targetCount;

  let registered = 0;
  for (const { slug } of candidates) {
    const existing = await prisma.atsCompany.findUnique({ where: { source_slug: { source, slug } } });
    if (!existing && targetReached) continue;

    const valid = await probeOfficialApi(source, slug);
    await prisma.atsCompany.upsert({
      where: { source_slug: { source, slug } },
      create: {
        source,
        slug,
        status: valid ? 'ACTIVE' : 'PENDING_VALIDATION',
        cadenceBucket: hashToBucket(slug),
        lastCheckedAt: new Date(),
        lastSuccessAt: valid ? new Date() : null,
      },
      update: valid
        ? { status: 'ACTIVE', lastSuccessAt: new Date(), lastCheckedAt: new Date() }
        : { lastCheckedAt: new Date() },
    });
    if (valid) registered++;
  }

  logger.info({
    event: 'company_discovery_complete',
    source,
    traceId,
    candidatesFound: candidates.length,
    registered,
    activeCount,
    targetReached,
  });
}
