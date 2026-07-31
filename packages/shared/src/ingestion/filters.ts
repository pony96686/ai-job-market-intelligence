import type { NormalizedJob } from './types';

const MAX_POSTED_AGE_DAYS = 90;
const REMOTE_LOCATION_PATTERN = /remote|worldwide|anywhere|🌍/i;
// RemoteOK and Himalayas are remote-only job boards by construction — their
// listings pass the remote-location filter unconditionally.
const REMOTE_FRIENDLY_SOURCES = new Set<NormalizedJob['source']>(['REMOTEOK', 'HIMALAYAS']);
const EXCLUDED_TAGS = new Set([
  'marketing',
  'sales',
  'support',
  'customer-success',
  'legal',
  'finance',
  'hr',
  'recruiting',
]);

export function passesFilter(job: NormalizedJob): boolean {
  if (job.title.length < 3) return false;
  if (job.description.length < 50) return false;

  if (job.postedAt) {
    const ageMs = Date.now() - job.postedAt.getTime();
    if (ageMs > MAX_POSTED_AGE_DAYS * 24 * 60 * 60 * 1000) return false;
  }

  if (!REMOTE_FRIENDLY_SOURCES.has(job.source) && !REMOTE_LOCATION_PATTERN.test(job.location)) return false;
  if (job.tags.some((tag) => EXCLUDED_TAGS.has(tag))) return false;

  return true;
}
