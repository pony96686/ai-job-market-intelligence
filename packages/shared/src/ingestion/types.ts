import type { JobSource, SalaryPeriod } from '../schemas/job';
import type { RegionBucket } from '../schemas/common';

export interface NormalizedJob {
  externalId: string;
  source: JobSource;
  title: string;
  company: string;
  description: string;
  url: string;
  location: string;
  tags: string[];
  postedAt: Date | null;
  salaryMin?: number;
  salaryMax?: number;
  // Only Himalayas sets these today. sourceStructured = true means
  // ingestion_parse skips AI Job Parsing and trusts these fields (plus
  // title/tags) directly instead of asking the LLM to infer them.
  salaryCurrency?: string;
  salaryPeriod?: SalaryPeriod;
  sourceStructured?: boolean;
  seniority?: string;
}

// Tier 3 sources (LinkedIn/Indeed/Glassdoor) MUST NOT implement this interface.
export interface JobSourceAdapter {
  source: JobSource;
  tier: 1 | 2;
  // GREENHOUSE/LEVER/ASHBY are "per company" sources — companySlug selects
  // which company's board to fetch.
  // Aggregator sources (REMOTEOK/HIMALAYAS) ignore it and fetch everything.
  fetch(companySlug?: string): Promise<unknown[]>;
  normalize(raw: unknown): NormalizedJob | null;
}

export interface ParsedJobFields {
  role: string;
  level: 'Junior' | 'Mid' | 'Senior' | 'Staff' | 'Principal' | 'Unknown';
  skills: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  remote: boolean;
  // Region restriction extracted from the posting text — empty = no explicit
  // restriction found (globally open).
  eligibleRegions: RegionBucket[];
  confidence: number;
}

// Legacy RemoteOK-only shape kept for the raw API response type; superseded
// by JobSourceAdapter.fetch() returning unknown[] for all sources.
export interface RemoteOKRawJob {
  id: string | number;
  slug?: string;
  company?: string;
  company_logo?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  url?: string;
  date?: string;
  salary_min?: number;
  salary_max?: number;
  apply_url?: string;
  legal?: string;
}
