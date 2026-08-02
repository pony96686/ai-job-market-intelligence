export interface HotCompanyActiveJob {
  company: string;
}

export interface HotCompanyRecentJob {
  company: string;
  // postedAt ?? createdAt, same convention as JobSkillsRecord.effectiveDate
  // in skill-trends/compute-trends.ts.
  effectiveDate: Date;
}

export interface HotCompanyResult {
  company: string;
  activeJobCount: number;
  growthPercent: number | null;
}

const GROWTH_WINDOW_DAYS = 30;
const MIN_SAMPLE_SIZE = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Pure statistics, no LLM call (mvp-scope.md/v2-scope.md §8 Epic 11.3).
// activeJobCount is always available (today's live ACTIVE-job count per
// company, no time window needed — roadmap.md §1.1's "绝对量优先"), while
// growthPercent compares recent vs prior GROWTH_WINDOW_DAYS-day posting
// activity and stays null until enough sample size accumulates — same
// progressive-enhancement pattern as computeSkillTrendSnapshots, just a
// single window instead of 30/90/365 since "hot companies" only needs one.
export function getHotCompanies(
  activeJobs: HotCompanyActiveJob[],
  recentJobs: HotCompanyRecentJob[],
  now: Date,
  limit: number,
): HotCompanyResult[] {
  const activeJobCounts = new Map<string, number>();
  for (const job of activeJobs) {
    activeJobCounts.set(job.company, (activeJobCounts.get(job.company) ?? 0) + 1);
  }

  const currentStart = new Date(now.getTime() - GROWTH_WINDOW_DAYS * MS_PER_DAY);
  const previousStart = new Date(currentStart.getTime() - GROWTH_WINDOW_DAYS * MS_PER_DAY);

  const currentCounts = new Map<string, number>();
  const previousCounts = new Map<string, number>();
  for (const job of recentJobs) {
    if (job.effectiveDate >= currentStart && job.effectiveDate < now) {
      currentCounts.set(job.company, (currentCounts.get(job.company) ?? 0) + 1);
    } else if (job.effectiveDate >= previousStart && job.effectiveDate < currentStart) {
      previousCounts.set(job.company, (previousCounts.get(job.company) ?? 0) + 1);
    }
  }

  return [...activeJobCounts.entries()]
    .map(([company, activeJobCount]) => {
      const current = currentCounts.get(company) ?? 0;
      const previous = previousCounts.get(company) ?? 0;
      const growthPercent =
        current >= MIN_SAMPLE_SIZE && previous > 0 ? ((current - previous) / previous) * 100 : null;
      return { company, activeJobCount, growthPercent };
    })
    .sort((a, b) => b.activeJobCount - a.activeJobCount)
    .slice(0, limit);
}
