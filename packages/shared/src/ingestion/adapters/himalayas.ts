import { stripHtml } from '../../utils/strip-html';
import { IngestionError } from '../errors';
import type { JobSourceAdapter, NormalizedJob } from '../types';

// No auth, offset/limit paged browse endpoint. This is a full aggregator
// (like RemoteOK) — one crawl covers every company, no per-company fan-out
// and no Company Discovery involvement.
//
// Real-world response shape differs from the originally documented interface
// in a few ways (confirmed against the live API):
//  - the API silently caps each page at 20 regardless of the requested
//    `limit`, so pagination must continue past a short page instead of
//    treating it as "last page"
//  - `description` is HTML, not plain text — needs stripping like every
//    other source
//  - `seniority` is an array (e.g. ["Senior"]), not a single string
//  - `pubDate` is a Unix epoch in seconds, not an ISO string
//  - `salaryPeriod` values are "annual"/"monthly"/"hourly", not "year"/"month"/"hour"
const HIMALAYAS_API = 'https://himalayas.app/jobs/api';
const REQUESTED_PAGE_SIZE = 100; // API ignores this and returns 20 regardless
// Safety cap on pagination — totalCount has been observed near 100k, this
// bounds a single daily crawl to the ~2,000 most recently posted jobs
// (results are returned newest-first).
const MAX_PAGES = 100;
const MIN_DESCRIPTION_LENGTH = 50;

interface HimalayasRawJob {
  guid: string;
  title: string;
  excerpt?: string;
  description: string;
  companyName: string;
  companySlug?: string;
  employmentType?: string;
  minSalary: number | null;
  maxSalary: number | null;
  salaryPeriod: 'hourly' | 'monthly' | 'annual' | null;
  currency: string | null;
  seniority?: string[];
  locationRestrictions?: string[];
  timezoneRestrictions?: number[];
  categories?: string[];
  pubDate?: number;
  applicationLink: string;
}

interface HimalayasResponse {
  jobs?: HimalayasRawJob[];
}

const SALARY_PERIOD_MAP: Record<string, NonNullable<NormalizedJob['salaryPeriod']>> = {
  hourly: 'HOURLY',
  monthly: 'MONTHLY',
  annual: 'ANNUAL',
};

async function fetchHimalayas(): Promise<HimalayasRawJob[]> {
  const results: HimalayasRawJob[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(`${HIMALAYAS_API}?offset=${offset}&limit=${REQUESTED_PAGE_SIZE}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new IngestionError(`Himalayas API returned ${res.status}`, {
        retryable: res.status >= 500,
      });
    }

    const data = (await res.json()) as HimalayasResponse;
    const jobs = data.jobs ?? [];
    if (jobs.length === 0) break;

    results.push(...jobs);
    offset += jobs.length;
  }

  return results;
}

// The live API has been observed returning the literal string "name" as
// companyName for a subset of postings — looks like a template-rendering
// bug on Himalayas's side (the field name leaking through instead of its
// value), reproduced by requesting limit=100 (what fetchHimalayas above
// uses) vs. a small limit which returns the real value for the same
// postings. companySlug stays correct in both cases, so it's the fallback
// once companyName is confirmed to be this sentinel garbage value rather
// than a genuine (if unlikely) company literally named "name".
const BROKEN_COMPANY_NAME_SENTINEL = 'name';

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function resolveCompanyName(raw: HimalayasRawJob): string {
  const companyName = raw.companyName?.trim();
  if (companyName && companyName.toLowerCase() !== BROKEN_COMPANY_NAME_SENTINEL) {
    return companyName;
  }
  if (raw.companySlug?.trim()) {
    return humanizeSlug(raw.companySlug.trim());
  }
  return 'Unknown';
}

function normalizeHimalayasJob(raw: HimalayasRawJob): NormalizedJob | null {
  if (!raw.guid || !raw.title?.trim()) return null;

  const description = stripHtml(raw.description ?? '');
  if (description.length < MIN_DESCRIPTION_LENGTH) return null;

  return {
    externalId: raw.guid,
    source: 'HIMALAYAS',
    title: raw.title.trim(),
    company: resolveCompanyName(raw),
    description,
    url: raw.applicationLink,
    location: raw.locationRestrictions?.length ? raw.locationRestrictions.join(', ') : 'Remote',
    locationRestrictions: raw.locationRestrictions,
    tags: raw.categories ?? [],
    postedAt: raw.pubDate ? new Date(raw.pubDate * 1000) : null,
    salaryMin: raw.minSalary ?? undefined,
    salaryMax: raw.maxSalary ?? undefined,
    salaryCurrency: raw.currency ?? undefined,
    salaryPeriod: raw.salaryPeriod ? SALARY_PERIOD_MAP[raw.salaryPeriod] : undefined,
    sourceStructured: true,
    seniority: raw.seniority?.[0],
  };
}

export const himalayasAdapter: JobSourceAdapter = {
  source: 'HIMALAYAS',
  tier: 1,
  fetch: fetchHimalayas,
  normalize: (raw) => normalizeHimalayasJob(raw as HimalayasRawJob),
};
