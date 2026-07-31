import { z } from 'zod';

export const SkillGapQuerySchema = z.object({
  targetRole: z.string().min(2).max(100),
});
export type SkillGapQuery = z.infer<typeof SkillGapQuerySchema>;

export const SkillGapResponseSchema = z.object({
  targetRole: z.string(),
  matchPercent: z.number().int().min(0).max(100),
  missingSkills: z.array(z.string()),
  sampleSize: z.number().int(),
  lowConfidence: z.boolean(),
  // Distinguishes "we found 0 required skills for this role" (no verdict
  // possible) from "we found some, and you already have them all" — an
  // empty missingSkills array alone is ambiguous between those two cases.
  hasSkillData: z.boolean(),
});
export type SkillGapResponse = z.infer<typeof SkillGapResponseSchema>;
