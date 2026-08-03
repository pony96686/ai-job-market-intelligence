import type { NormalizedJob } from './types';

const MAX_POSTED_AGE_DAYS = 90;
const REMOTE_LOCATION_PATTERN = /remote|worldwide|anywhere|🌍/i;
// RemoteOK and Himalayas are remote-only job boards by construction — their
// listings pass the remote-location filter unconditionally.
const REMOTE_FRIENDLY_SOURCES = new Set<NormalizedJob['source']>(['REMOTEOK', 'HIMALAYAS']);
const EXCLUDED_TAGS = new Set([
  'marketing',
  'sales',
  'b2b-sales',
  'enterprise-sales',
  'inside-sales',
  'business-development',
  'support',
  'customer-success',
  'legal',
  'finance',
  'hr',
  'recruiting',
  'healthcare',
  'medical',
  'radiology',
]);

// Shared with the one-time backfill script (apps/worker/
// scripts/backfill-remove-nontech-jobs.ts), which re-applies this exact rule
// against already-ingested jobs, not just new ones going forward.
export function hasExcludedTag(tags: string[]): boolean {
  return tags.some((tag) => EXCLUDED_TAGS.has(tag.toLowerCase()));
}

// Independent of EXCLUDED_TAGS — Greenhouse/Lever/Ashby never provide native
// tags (normalize() always leaves that array empty for them), so tag-only
// filtering is a no-op for those three sources. Checked as word-boundary
// matches, not substring, so "designer" doesn't false-positive on
// "Design Systems Engineer"/"Software Design Engineer".
const EXCLUDED_TITLE_KEYWORDS = [
  'sales',
  'marketing',
  'business development',
  'recruiting',
  'recruiter',
  'customer success',
  'hr',
  'human resources',
  'legal',
  'counsel',
  'finance',
  'financial',
  'healthcare',
  'medical',
  'designer',
  'chief of staff',
  'media buyer',
  'social media',
  'account executive',
  'account manager',
];

function toWordBoundaryPattern(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

const EXCLUDED_TITLE_PATTERNS = EXCLUDED_TITLE_KEYWORDS.map(toWordBoundaryPattern);

// Shared with the one-time backfill script (apps/worker/
// scripts/backfill-remove-nontech-titles.ts).
export function hasExcludedTitleKeyword(title: string): boolean {
  return EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(title));
}

export function passesFilter(job: NormalizedJob): boolean {
  if (job.title.length < 3) return false;
  if (job.description.length < 50) return false;

  if (job.postedAt) {
    const ageMs = Date.now() - job.postedAt.getTime();
    if (ageMs > MAX_POSTED_AGE_DAYS * 24 * 60 * 60 * 1000) return false;
  }

  if (!REMOTE_FRIENDLY_SOURCES.has(job.source) && !REMOTE_LOCATION_PATTERN.test(job.location))
    return false;
  if (hasExcludedTag(job.tags) || hasExcludedTitleKeyword(job.title)) return false;

  return true;
}
