import { z } from 'zod';

const WINDOW_DAYS_VALUES = [30, 90, 365] as const;
export const WindowDaysSchema = z.coerce
  .number()
  .int()
  .refine(
    (v): v is (typeof WINDOW_DAYS_VALUES)[number] =>
      (WINDOW_DAYS_VALUES as readonly number[]).includes(v),
    {
      message: 'windowDays must be one of 30, 90, 365',
    },
  );

// GET /api/v1/skills/ranking
export const SkillRankingQuerySchema = z.object({
  windowDays: WindowDaysSchema.default(90),
  // growing/declining sort against growthPercent — see mvp-scope.md §8 Epic
  // 10.4: skills with growthPercent=null (not enough data yet) are filtered
  // out of those two sorts, not shown with a misleading value.
  sort: z.enum(['count', 'growing', 'declining']).default('count'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type SkillRankingQuery = z.infer<typeof SkillRankingQuerySchema>;

export const SkillRankingItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  jobCount: z.number().int(),
  growthPercent: z.number().nullable(),
});
export type SkillRankingItem = z.infer<typeof SkillRankingItemSchema>;

// GET /api/v1/skills/trend — full history for one skill, so the frontend can
// chart it over time (skill_trend_snapshots keeps all history indefinitely,
// see database-schema.md §11.4).
export const SkillTrendQuerySchema = z.object({
  skill: z.string().min(1),
  windowDays: WindowDaysSchema.default(90),
});
export type SkillTrendQuery = z.infer<typeof SkillTrendQuerySchema>;

export const SkillTrendPointSchema = z.object({
  periodEnd: z.string().datetime(),
  jobCount: z.number().int(),
  growthPercent: z.number().nullable(),
});

export const SkillTrendResponseSchema = z.object({
  slug: z.string(),
  name: z.string(),
  windowDays: z.number().int(),
  series: z.array(SkillTrendPointSchema),
});
export type SkillTrendResponse = z.infer<typeof SkillTrendResponseSchema>;

// GET /api/v1/skills/heatmap?role={role} — one role per call, skill x role
// matrix assembled client-side across a fixed role list.
export const SkillHeatmapQuerySchema = z.object({
  role: z.string().min(1),
});
export type SkillHeatmapQuery = z.infer<typeof SkillHeatmapQuerySchema>;

export const SkillHeatmapItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  jobCount: z.number().int(),
});

export const SkillHeatmapResponseSchema = z.object({
  role: z.string(),
  skills: z.array(SkillHeatmapItemSchema),
});
export type SkillHeatmapResponse = z.infer<typeof SkillHeatmapResponseSchema>;
