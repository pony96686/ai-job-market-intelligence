import type { JobDecision } from '@ai-job-market-intelligence/shared';

export function toDecision(score: number): JobDecision {
  if (score >= 75) return 'APPLY';
  if (score >= 50) return 'MAYBE';
  return 'SKIP';
}
