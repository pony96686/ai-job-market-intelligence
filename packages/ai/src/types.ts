import type { RegionBucket, SalaryPeriod } from '@ai-job-market-intelligence/shared';

export interface ProfileInput {
  skills: string[];
  experienceYears: number;
  preferredRoles: string[];
  // ISO 3166-1 alpha-2 country codes — mapped to a RegionBucket at scoring
  // time (see rule-score.ts's regionPenalty), not stored as a bucket.
  preferredCountries: string[];
  // Expected minimum annual salary (USD). null = no salary preference.
  expectedSalaryMin: number | null;
}

export interface JobInput {
  title: string;
  company: string;
  tags: string[];
  description: string;
  eligibleRegions: RegionBucket[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
}
