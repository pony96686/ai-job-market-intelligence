import type { NormalizedJob, ParsedJobFields } from '@ai-job-market-intelligence/shared/ingestion';
import { normalizeSkill } from '@ai-job-market-intelligence/shared/skills';

// Sources that set sourceStructured=true (currently only Himalayas) already
// provide salary/seniority/employmentType natively — this builds
// ParsedJobFields from that data directly instead of calling the LLM, which
// both saves the API call and is more accurate than an LLM guess.

const SENIORITY_MAP: Record<string, ParsedJobFields['level']> = {
  intern: 'Junior',
  entry: 'Junior',
  'entry-level': 'Junior',
  junior: 'Junior',
  associate: 'Junior',
  mid: 'Mid',
  'mid-level': 'Mid',
  intermediate: 'Mid',
  senior: 'Senior',
  'senior-level': 'Senior',
  lead: 'Staff',
  staff: 'Staff',
  principal: 'Principal',
  director: 'Principal',
  executive: 'Principal',
};

export function mapSeniority(seniority: string | undefined): ParsedJobFields['level'] {
  if (!seniority) return 'Unknown';
  return SENIORITY_MAP[seniority.toLowerCase().trim()] ?? 'Unknown';
}

export function normalizeRole(title: string, _seniority: string | undefined): string {
  return title.trim();
}

// Himalayas' own `tags` come from its `categories` field — a job-role/
// category taxonomy ("ai-engineering", "cloud-engineer"), not a technical
// skill list, and includes plenty of entries that are pure noise even after
// splitting ("software-engineer-ii"). Running each tag through the same
// manually maintained skill whitelist normalizeSkill() applies to every
// other source keeps this field genuinely "normalized skill names" as
// documented on Job.skills, instead of a raw, unfiltered pass-through of
// whatever the source happened to call a "tag".
export function extractTagsAsSkills(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    for (const { slug } of normalizeSkill(tag)) {
      seen.add(slug);
    }
  }
  return [...seen];
}

export function buildStructuredJobFields(normalized: NormalizedJob): ParsedJobFields {
  return {
    role: normalizeRole(normalized.title, normalized.seniority),
    level: mapSeniority(normalized.seniority),
    skills: extractTagsAsSkills(normalized.tags),
    salaryMin: normalized.salaryMin ?? null,
    salaryMax: normalized.salaryMax ?? null,
    remote: true,
    // Fixed empty — none of today's sourceStructured sources natively
    // provide a region field.
    eligibleRegions: [],
    confidence: 1.0,
  };
}
