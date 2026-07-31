import { describe, it, expect } from 'vitest';
import { toDecision } from '../decision';

describe('toDecision', () => {
  it.each([
    [85, 'APPLY'],
    [75, 'APPLY'],
    [74, 'MAYBE'],
    [50, 'MAYBE'],
    [49, 'SKIP'],
    [0, 'SKIP'],
  ])('score %d -> %s', (score, expected) => {
    expect(toDecision(score)).toBe(expected);
  });
});
