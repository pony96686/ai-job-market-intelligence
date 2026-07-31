import { remoteOKAdapter } from './adapters/remoteok';
import { greenhouseAdapter } from './adapters/greenhouse';
import { leverAdapter } from './adapters/lever';
import { ashbyAdapter } from './adapters/ashby';
import { himalayasAdapter } from './adapters/himalayas';
import type { JobSourceAdapter } from './types';

// V1 Tier-1 sources only (this finalized 5-source lineup —
// WeWorkRemotely/HN Who's Hiring were evaluated and removed). New adapters
// MUST complete the compliance tiering review before being added here —
// Tier 3 sources (LinkedIn/Indeed/Glassdoor) MUST NOT ever appear.
export const adapters: JobSourceAdapter[] = [
  remoteOKAdapter,
  greenhouseAdapter,
  leverAdapter,
  ashbyAdapter,
  himalayasAdapter,
];

export function getAdapterBySource(source: JobSourceAdapter['source']): JobSourceAdapter | undefined {
  return adapters.find((adapter) => adapter.source === source);
}
