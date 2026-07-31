import { stripHtml } from '../../utils/strip-html';
import { IngestionError } from '../errors';
import type { JobSourceAdapter, NormalizedJob, RemoteOKRawJob } from '../types';

const REMOTEOK_API = 'https://remoteok.com/api';
const MIN_DESCRIPTION_LENGTH = 50;

async function fetchRemoteOK(): Promise<RemoteOKRawJob[]> {
  const res = await fetch(REMOTEOK_API, {
    headers: {
      'User-Agent': process.env.REMOTEOK_USER_AGENT ?? 'AI-Job-Market-Intelligence/1.0',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new IngestionError(`RemoteOK API returned ${res.status}`, {
      retryable: res.status >= 500,
    });
  }

  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new IngestionError('RemoteOK API returned non-array');
  }

  // The first element is a legal notice / metadata entry, not a job — skip it
  return data.filter((item): item is RemoteOKRawJob => Boolean(item?.id) && !item.legal);
}

function normalizeRemoteOKJob(raw: RemoteOKRawJob): NormalizedJob | null {
  if (!raw.id || !raw.position?.trim()) return null;

  const description = stripHtml(raw.description ?? '');
  if (description.length < MIN_DESCRIPTION_LENGTH) return null;

  return {
    externalId: String(raw.id),
    source: 'REMOTEOK',
    title: raw.position.trim(),
    company: raw.company?.trim() || 'Unknown',
    description,
    url: raw.apply_url || raw.url || `https://remoteok.com/remote-jobs/${raw.id}`,
    location: raw.location?.trim() || 'Remote',
    tags: (raw.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean),
    postedAt: raw.date ? new Date(raw.date) : null,
    salaryMin: raw.salary_min,
    salaryMax: raw.salary_max,
  };
}

export const remoteOKAdapter: JobSourceAdapter = {
  source: 'REMOTEOK',
  tier: 1,
  fetch: fetchRemoteOK,
  normalize: (raw) => normalizeRemoteOKJob(raw as RemoteOKRawJob),
};
