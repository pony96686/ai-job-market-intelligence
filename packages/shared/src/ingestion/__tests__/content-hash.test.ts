import { describe, it, expect } from 'vitest';
import { computeContentHash } from '../content-hash';

describe('computeContentHash', () => {
  it('is deterministic for the same input', () => {
    const job = { title: 'Backend Engineer', description: 'Build things.', salaryMin: 100_000, salaryMax: 150_000 };
    expect(computeContentHash(job)).toBe(computeContentHash({ ...job }));
  });

  it('changes when the description changes', () => {
    const a = computeContentHash({ title: 'X', description: 'A' });
    const b = computeContentHash({ title: 'X', description: 'B' });
    expect(a).not.toBe(b);
  });

  it('changes when salary changes', () => {
    const a = computeContentHash({ title: 'X', description: 'A', salaryMin: 100_000 });
    const b = computeContentHash({ title: 'X', description: 'A', salaryMin: 120_000 });
    expect(a).not.toBe(b);
  });

  it('produces a 64-char hex sha256 digest', () => {
    const hash = computeContentHash({ title: 'X', description: 'A' });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
