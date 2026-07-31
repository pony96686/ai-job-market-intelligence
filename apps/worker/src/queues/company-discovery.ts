import { getCompanyDiscoveryQueue, COMPANY_DISCOVERY_JOB_OPTS } from '@ai-job-market-intelligence/shared/queue';

const SOURCES = ['GREENHOUSE', 'LEVER', 'ASHBY'] as const;

// Discovery is a slow-changing process, weekly is enough — Monday 04:00 UTC,
// well outside the 30min ingestion_collect cadence.
const WEEKLY_MONDAY_4AM = '0 4 * * 1';

// Common Crawl Index Discovery needs no configuration — no API key, no
// operator-supplied domain list — so this is just one fixed weekly job per
// "per company" ATS source.
export async function scheduleCompanyDiscoveryCron(): Promise<void> {
  const queue = getCompanyDiscoveryQueue();

  await Promise.all(
    SOURCES.map((source) =>
      queue.add(
        'discover',
        { source },
        {
          ...COMPANY_DISCOVERY_JOB_OPTS,
          jobId: `company-discovery-cron:${source}`,
          repeat: { pattern: WEEKLY_MONDAY_4AM, immediately: false },
        },
      ),
    ),
  );
}
