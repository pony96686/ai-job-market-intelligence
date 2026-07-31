import { describe, it, expect } from 'vitest';
import { topFrequentSkills } from '../top-frequent-skills';

describe('topFrequentSkills', () => {
  it('ranks skills by frequency across job tag lists', () => {
    const result = topFrequentSkills(
      [
        ['node', 'typescript', 'aws'],
        ['node', 'react'],
        ['node', 'typescript'],
      ],
      2,
    );
    expect(result).toEqual(['node', 'typescript']);
  });

  it('normalizes case and trims whitespace before counting', () => {
    const result = topFrequentSkills([['Node'], [' node '], ['NODE']], 1);
    expect(result).toEqual(['node']);
  });

  it('ignores empty tags', () => {
    const result = topFrequentSkills([['node', ''], ['  ']], 5);
    expect(result).toEqual(['node']);
  });

  it('returns an empty array for no jobs', () => {
    expect(topFrequentSkills([], 5)).toEqual([]);
  });
});
