import { stripHtml } from '../../utils/strip-html';
import { IngestionError } from '../errors';
import type { JobSourceAdapter, NormalizedJob } from '../types';

const MIN_DESCRIPTION_LENGTH = 50;

interface LeverRawJob {
  id: string;
  text: string;
  categories: { location: string; team: string };
  descriptionPlain: string;
  hostedUrl: string;
  createdAt: number;
}

interface LeverFetchResult {
  company: string;
  job: LeverRawJob;
}

// One call per company, fanned out by the ingestion_collect batch trigger
// reading `ats_companies` — this adapter no longer loops over a static
// LEVER_COMPANY_SLUGS whitelist.
async function fetchLever(companySlug?: string): Promise<LeverFetchResult[]> {
  if (!companySlug) return [];

  const res = await fetch(`https://api.lever.co/v0/postings/${companySlug}?mode=json`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    if (res.status >= 500) throw new IngestionError(`Lever API returned ${res.status} for ${companySlug}`, { retryable: true });
    return []; // 404 etc — the caller tracks company validity via probeOfficialApi, not this
  }

  const jobs = (await res.json()) as LeverRawJob[];
  return (jobs ?? []).map((job) => ({ company: companySlug, job }));
}

function normalizeLeverJob(raw: LeverFetchResult): NormalizedJob | null {
  const { company, job } = raw;
  if (!job?.id || !job.text?.trim()) return null;

  const description = stripHtml(job.descriptionPlain ?? '');
  if (description.length < MIN_DESCRIPTION_LENGTH) return null;

  return {
    externalId: job.id,
    source: 'LEVER',
    title: job.text.trim(),
    company,
    description,
    url: job.hostedUrl,
    location: job.categories?.location?.trim() || 'Remote',
    tags: job.categories?.team ? [job.categories.team.toLowerCase().trim()] : [],
    postedAt: job.createdAt ? new Date(job.createdAt) : null,
  };
}

export const leverAdapter: JobSourceAdapter = {
  source: 'LEVER',
  tier: 1,
  fetch: fetchLever,
  normalize: (raw) => normalizeLeverJob(raw as LeverFetchResult),
};
