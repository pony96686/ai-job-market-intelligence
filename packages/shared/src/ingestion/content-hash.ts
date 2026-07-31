import { createHash } from 'node:crypto';
import type { NormalizedJob } from './types';

// Fixed-length fingerprint of the fields that would actually change AI Job
// Parsing / embedding output, so a re-crawl of an unchanged posting can skip
// straight to a metadata-only update instead of re-running the LLM +
// embedding + dedup pipeline.
export function computeContentHash(normalized: Pick<NormalizedJob, 'title' | 'description' | 'salaryMin' | 'salaryMax'>): string {
  const material = `${normalized.title}|${normalized.description}|${normalized.salaryMin ?? ''}|${normalized.salaryMax ?? ''}`;
  return createHash('sha256').update(material).digest('hex');
}
