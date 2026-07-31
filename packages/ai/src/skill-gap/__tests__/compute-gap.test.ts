import { describe, it, expect } from 'vitest';
import { computeSkillGap } from '../compute-gap';

describe('computeSkillGap', () => {
  it('returns 100% match and no missing skills when the user has everything', () => {
    const result = computeSkillGap(['node', 'typescript'], ['Node', 'TypeScript', 'React']);
    expect(result.matchPercent).toBe(100);
    expect(result.missingSkills).toEqual([]);
  });

  it('lists missing skills case-insensitively', () => {
    const result = computeSkillGap(['node', 'kubernetes', 'terraform'], ['Node']);
    expect(result.matchPercent).toBe(33);
    expect(result.missingSkills).toEqual(['kubernetes', 'terraform']);
  });

  it('returns 0% match with no required skills data', () => {
    expect(computeSkillGap([], ['node'])).toEqual({ matchPercent: 0, missingSkills: [] });
  });
});
