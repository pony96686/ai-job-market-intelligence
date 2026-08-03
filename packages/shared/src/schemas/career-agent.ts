import { z } from 'zod';

// CareerBrief.summary JSON shape, structured
// data only — no LLM call. Written by
// apps/worker's career_brief_generate processor, read by
// GET /api/v1/career-agent/briefs/latest and the career-brief email
// template.
export const SkillGrowthHighlightSchema = z.object({
  slug: z.string(),
  name: z.string(),
  jobCount: z.number().int(),
  growthPercent: z.number().nullable(),
});

export const HotCompanyHighlightSchema = z.object({
  company: z.string(),
  activeJobCount: z.number().int(),
  growthPercent: z.number().nullable(),
});

export const RecommendedJobSchema = z.object({
  jobId: z.string(),
  title: z.string(),
  company: z.string(),
  score: z.number().int(),
});

export const RecommendedSkillSchema = z.object({
  slug: z.string(),
  name: z.string(),
  jobCount: z.number().int(),
  growthPercent: z.number().nullable(),
});

export const CareerBriefSummarySchema = z.object({
  marketHighlights: z.object({
    topGrowingSkills: z.array(SkillGrowthHighlightSchema),
    hotCompanies: z.array(HotCompanyHighlightSchema),
  }),
  recommendedJobs: z.array(RecommendedJobSchema),
  recommendedSkill: RecommendedSkillSchema.nullable(),
});
export type CareerBriefSummary = z.infer<typeof CareerBriefSummarySchema>;

// GET /api/v1/career-agent/briefs/latest
export const CareerBriefResponseSchema = z.object({
  briefDate: z.string(), // YYYY-MM-DD
  summary: CareerBriefSummarySchema,
});
export type CareerBriefResponse = z.infer<typeof CareerBriefResponseSchema>;

// POST/GET /api/v1/career-coach/messages
export const CareerCoachMessageSchema = z.object({
  role: z.enum(['USER', 'ASSISTANT']),
  content: z.string(),
  createdAt: z.string().datetime(),
});
export type CareerCoachMessageDto = z.infer<typeof CareerCoachMessageSchema>;

export const CareerCoachSendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});
export type CareerCoachSendMessage = z.infer<typeof CareerCoachSendMessageSchema>;

// DELETE /api/v1/career-coach/messages
export const CareerCoachClearResponseSchema = z.object({
  cleared: z.literal(true),
});
export type CareerCoachClearResponse = z.infer<typeof CareerCoachClearResponseSchema>;
