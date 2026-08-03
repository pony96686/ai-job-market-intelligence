import { normalizeSkill } from '@ai-job-market-intelligence/shared/skills';

export interface CareerPathRoleJobs {
  role: string;
  // Each job's raw skills — same shape as JobSkillsRecord.skills in
  // skill-trends/compute-trends.ts, run through the same normalizeSkill
  // pipeline here.
  jobs: { skills: string[] }[];
}

export interface CareerPathSkillGap {
  slug: string;
  name: string;
  jobCount: number;
  growthPercent: number | null;
}

export interface CareerPathRecommendation {
  role: string;
  matchPercent: number;
  missingSkills: CareerPathSkillGap[];
}

const MAX_RECOMMENDATIONS = 2;
const MAX_MISSING_SKILLS = 8;

// Pure statistics, no LLM call.
// Ranks candidate roles by how in-demand their missing skills are — a role
// where the user already covers everything, or one with no overlap at all,
// scores 0 and is excluded, so "you're already there" and "unrelated field"
// cases don't need special-case handling.
export function getCareerPathRecommendations(
  userSkills: string[],
  candidateRoles: CareerPathRoleJobs[],
  // slug -> latest growthPercent, e.g. from the day's skill_trend_snapshots.
  // Optional and additive — growth data layers
  // in as a weighting factor once it's available, and takes effect on its
  // own as it accumulates; omitting it just means every candidate's weight
  // falls back to plain jobCount.
  skillGrowth: ReadonlyMap<string, number | null> = new Map(),
): CareerPathRecommendation[] {
  const userSlugs = new Set(userSkills.flatMap((raw) => normalizeSkill(raw).map((s) => s.slug)));

  function weight(jobCount: number, growthPercent: number | null): number {
    return jobCount * (1 + (growthPercent ?? 0) / 100);
  }

  const candidates = candidateRoles.map(({ role, jobs }) => {
    const demand = new Map<string, { name: string; jobCount: number }>();
    for (const job of jobs) {
      const seen = new Set<string>();
      for (const raw of job.skills) {
        for (const { slug, name } of normalizeSkill(raw)) {
          if (seen.has(slug)) continue;
          seen.add(slug);
          const entry = demand.get(slug);
          demand.set(slug, { name, jobCount: (entry?.jobCount ?? 0) + 1 });
        }
      }
    }

    const required = [...demand.entries()].map(([slug, { name, jobCount }]) => ({
      slug,
      name,
      jobCount,
    }));
    const matchedCount = required.filter((s) => userSlugs.has(s.slug)).length;
    const matchPercent =
      required.length === 0 ? 0 : Math.round((matchedCount / required.length) * 100);

    const missingSkills: CareerPathSkillGap[] = required
      .filter((s) => !userSlugs.has(s.slug))
      .map((s) => ({ ...s, growthPercent: skillGrowth.get(s.slug) ?? null }))
      .sort((a, b) => weight(b.jobCount, b.growthPercent) - weight(a.jobCount, a.growthPercent))
      .slice(0, MAX_MISSING_SKILLS);

    const relevanceScore = missingSkills.reduce(
      (sum, s) => sum + weight(s.jobCount, s.growthPercent),
      0,
    );

    return { role, matchPercent, missingSkills, relevanceScore };
  });

  return candidates
    .filter((c) => c.matchPercent > 0 && c.missingSkills.length > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_RECOMMENDATIONS)
    .map(({ role, matchPercent, missingSkills }) => ({ role, matchPercent, missingSkills }));
}
