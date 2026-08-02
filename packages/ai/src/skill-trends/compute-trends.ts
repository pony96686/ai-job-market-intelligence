import { normalizeSkill } from '@ai-job-market-intelligence/shared/skills';

export interface JobSkillsRecord {
  skills: string[];
  // Resolved by the caller as postedAt ?? createdAt — this module doesn't
  // know about the Job model's field names.
  effectiveDate: Date;
}

export interface SkillTrendSnapshotResult {
  slug: string;
  name: string;
  windowDays: number;
  periodEnd: Date;
  jobCount: number;
  growthPercent: number | null;
}

// 30/90/365-day windows, see roadmap.md §1.1.
const WINDOW_DAYS = [30, 90, 365] as const;
// Below this sample size (or when the prior same-length window has no data
// at all, i.e. the pipeline hasn't been running long enough to cover two
// windows) growthPercent is left null rather than showing a misleadingly
// precise percentage off a tiny base.
const MIN_SAMPLE_SIZE = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

// Pure function: absolute mention counts always compute (available from day
// one of ingestion); growth rate only when both windows have enough data —
// absolute-count-first, growth-rate-as-progressive-enhancement, see
// mvp-scope.md §8 Epic 10.3/roadmap.md §1.1.
export function computeSkillTrendSnapshots(
  jobs: JobSkillsRecord[],
  now: Date,
): SkillTrendSnapshotResult[] {
  const periodEnd = startOfUTCDay(now);
  // Exclusive upper bound = start of tomorrow, so a job posted anytime
  // "today" (after midnight but before `now`'s time-of-day) still counts —
  // periodEnd itself stays a clean midnight value for the stored snapshot.
  const currentEndExclusive = new Date(periodEnd.getTime() + MS_PER_DAY);
  const results: SkillTrendSnapshotResult[] = [];

  for (const windowDays of WINDOW_DAYS) {
    const currentStart = new Date(currentEndExclusive.getTime() - windowDays * MS_PER_DAY);
    const previousStart = new Date(currentStart.getTime() - windowDays * MS_PER_DAY);

    const currentCounts = new Map<string, { count: number; name: string }>();
    const previousCounts = new Map<string, number>();

    for (const job of jobs) {
      const inCurrent =
        job.effectiveDate >= currentStart && job.effectiveDate < currentEndExclusive;
      const inPrevious = job.effectiveDate >= previousStart && job.effectiveDate < currentStart;
      if (!inCurrent && !inPrevious) continue;

      // Dedupe within a single job so synonym variants of the same skill
      // (e.g. "js" and "javascript" both on one posting) don't double-count.
      const seenSlugs = new Set<string>();
      for (const raw of job.skills) {
        for (const { slug, name } of normalizeSkill(raw)) {
          if (seenSlugs.has(slug)) continue;
          seenSlugs.add(slug);

          if (inCurrent) {
            const entry = currentCounts.get(slug);
            currentCounts.set(slug, { count: (entry?.count ?? 0) + 1, name });
          }
          if (inPrevious) {
            previousCounts.set(slug, (previousCounts.get(slug) ?? 0) + 1);
          }
        }
      }
    }

    for (const [slug, { count, name }] of currentCounts) {
      const previousCount = previousCounts.get(slug) ?? 0;
      const growthPercent =
        count >= MIN_SAMPLE_SIZE && previousCount > 0
          ? ((count - previousCount) / previousCount) * 100
          : null;

      results.push({ slug, name, windowDays, periodEnd, jobCount: count, growthPercent });
    }
  }

  return results;
}
