import type { SkillGapResponse } from '@ai-job-market-intelligence/shared';

export async function fetchSkillGap(targetRole: string): Promise<SkillGapResponse> {
  const res = await fetch(`/api/v1/skill-gap?targetRole=${encodeURIComponent(targetRole)}`);
  if (!res.ok) throw new Error('Failed to load skill gap analysis');
  const body = await res.json();
  return body.data;
}
