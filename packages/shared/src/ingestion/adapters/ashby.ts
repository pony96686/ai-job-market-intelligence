import { stripHtml } from '../../utils/strip-html';
import { IngestionError } from '../errors';
import type { JobSourceAdapter, NormalizedJob } from '../types';

const MIN_DESCRIPTION_LENGTH = 50;

interface AshbyRawJob {
  id: string;
  title: string;
  location: string;
  descriptionHtml: string;
  publishedAt: string;
  jobUrl: string;
  compensation?: {
    compensationTierSummary?: string;
  };
}

// company: the ats_companies-registered display name — a single Ashby board
// never returns its own company name in the response body.
interface AshbyFetchResult {
  company: string;
  job: AshbyRawJob;
}

// One call per company, fanned out by the ingestion_collect batch trigger
// reading `ats_companies` — this adapter no longer loops over a static
// whitelist itself.
async function fetchAshby(companySlug?: string): Promise<AshbyFetchResult[]> {
  if (!companySlug) return [];

  const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${companySlug}?includeCompensation=true`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    if (res.status >= 500) throw new IngestionError(`Ashby API returned ${res.status} for ${companySlug}`, { retryable: true });
    return []; // 404 etc — the caller tracks company validity via probeOfficialApi, not this
  }

  const data = (await res.json()) as { jobs?: AshbyRawJob[] };
  return (data.jobs ?? []).map((job) => ({ company: companySlug, job }));
}

function normalizeAshbyJob(raw: AshbyFetchResult): NormalizedJob | null {
  const { company, job } = raw;
  if (!job?.id || !job.title?.trim()) return null;

  const description = stripHtml(job.descriptionHtml ?? '');
  if (description.length < MIN_DESCRIPTION_LENGTH) return null;

  return {
    externalId: job.id,
    source: 'ASHBY',
    title: job.title.trim(),
    company,
    description,
    url: job.jobUrl,
    location: job.location?.trim() || 'Remote',
    tags: [],
    postedAt: job.publishedAt ? new Date(job.publishedAt) : null,
  };
}

export const ashbyAdapter: JobSourceAdapter = {
  source: 'ASHBY',
  tier: 1,
  fetch: fetchAshby,
  normalize: (raw) => normalizeAshbyJob(raw as AshbyFetchResult),
};
