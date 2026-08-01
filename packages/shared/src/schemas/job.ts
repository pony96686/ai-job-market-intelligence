import { z } from 'zod';
import { PaginationQuerySchema, RegionBucketSchema } from './common';

export const JobDecisionSchema = z.enum(['APPLY', 'MAYBE', 'SKIP']);
export type JobDecision = z.infer<typeof JobDecisionSchema>;

export const JobSourceSchema = z.enum(['REMOTEOK', 'GREENHOUSE', 'LEVER', 'ASHBY', 'HIMALAYAS']);
export type JobSource = z.infer<typeof JobSourceSchema>;

export const JobLevelSchema = z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Principal', 'Unknown']);
export type JobLevel = z.infer<typeof JobLevelSchema>;

export const SalaryPeriodSchema = z.enum(['HOURLY', 'MONTHLY', 'ANNUAL']);
export type SalaryPeriod = z.infer<typeof SalaryPeriodSchema>;

export const JobStatusSchema = z.enum(['ACTIVE', 'CLOSED']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobListQuerySchema = PaginationQuerySchema.extend({
  decision: JobDecisionSchema.optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(['score', 'date']).default('score'),
});
export type JobListQuery = z.infer<typeof JobListQuerySchema>;

export const JobScoreSummarySchema = z.object({
  value: z.number().int(),
  decision: JobDecisionSchema,
  reasoning: z.string(),
  strengths: z.array(z.string()),
  skillGap: z.array(z.string()),
});

export const JobListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  source: JobSourceSchema,
  role: z.string().nullable(),
  level: JobLevelSchema.nullable(),
  location: z.string(),
  url: z.string().url(),
  tags: z.array(z.string()),
  postedAt: z.string().datetime().nullable(),
  score: JobScoreSummarySchema,
});
export type JobListItem = z.infer<typeof JobListItemSchema>;

export const JobResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  description: z.string(),
  url: z.string().url(),
  location: z.string(),
  tags: z.array(z.string()),
  source: JobSourceSchema,
  role: z.string().nullable(),
  level: JobLevelSchema.nullable(),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  // Only sourceStructured sources (Himalayas) populate these — everything
  // else is null and the frontend assumes annual USD.
  salaryCurrency: z.string().nullable(),
  salaryPeriod: SalaryPeriodSchema.nullable(),
  remote: z.boolean(),
  eligibleRegions: z.array(RegionBucketSchema),
  parseConfidence: z.number().min(0).max(1).nullable(),
  status: JobStatusSchema,
  postedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type JobResponse = z.infer<typeof JobResponseSchema>;
