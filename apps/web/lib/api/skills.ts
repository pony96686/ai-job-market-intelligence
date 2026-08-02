import type {
  SkillRankingItem,
  SkillHeatmapResponse,
  SkillTrendResponse,
} from '@ai-job-market-intelligence/shared';

export type SkillRankingSort = 'count' | 'growing' | 'declining';
export type SkillWindowDays = 30 | 90 | 365;

export interface SkillRankingQuery {
  windowDays: SkillWindowDays;
  sort: SkillRankingSort;
  limit?: number;
}

export async function fetchSkillRanking(query: SkillRankingQuery): Promise<SkillRankingItem[]> {
  const params = new URLSearchParams();
  params.set('windowDays', String(query.windowDays));
  params.set('sort', query.sort);
  if (query.limit) params.set('limit', String(query.limit));

  const res = await fetch(`/api/v1/skills/ranking?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load skill ranking');
  const body = await res.json();
  return body.data;
}

export async function fetchSkillHeatmap(role: string): Promise<SkillHeatmapResponse> {
  const res = await fetch(`/api/v1/skills/heatmap?role=${encodeURIComponent(role)}`);
  if (!res.ok) throw new Error('Failed to load skill heatmap');
  const body = await res.json();
  return body.data;
}

// Returns null (not an error) when the skill isn't tracked yet — no job has
// mentioned it in the aggregate so far — so SkillGrowthCard can just omit
// it instead of surfacing a query error for an expected, common case.
export async function fetchSkillTrend(
  slug: string,
  windowDays: SkillWindowDays,
): Promise<SkillTrendResponse | null> {
  const res = await fetch(
    `/api/v1/skills/trend?skill=${encodeURIComponent(slug)}&windowDays=${windowDays}`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load skill trend');
  const body = await res.json();
  return body.data;
}
