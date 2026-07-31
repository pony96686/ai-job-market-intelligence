import { describe, it, expect } from 'vitest';
import { hashToBucket, currentCadenceBucket } from '../../company-discovery/cadence-bucket';

describe('hashToBucket', () => {
  it('is deterministic for the same slug', () => {
    expect(hashToBucket('acme')).toBe(hashToBucket('acme'));
  });

  it('returns a bucket within [0, 48)', () => {
    for (const slug of ['acme', 'widgetco', 'a', '', 'company-with-a-very-long-slug-name']) {
      const bucket = hashToBucket(slug);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(48);
    }
  });

  it('distributes different slugs across different buckets (not everything into bucket 0)', () => {
    const buckets = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(hashToBucket));
    expect(buckets.size).toBeGreaterThan(1);
  });
});

describe('currentCadenceBucket', () => {
  it('returns a bucket within [0, 48)', () => {
    const bucket = currentCadenceBucket();
    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThan(48);
  });

  it('is stable within the same 30-minute window', () => {
    const now = new Date('2026-07-31T10:05:00Z');
    const later = new Date('2026-07-31T10:20:00Z');
    expect(currentCadenceBucket(now)).toBe(currentCadenceBucket(later));
  });

  it('changes across a 30-minute window boundary', () => {
    const before = new Date('2026-07-31T10:29:00Z');
    const after = new Date('2026-07-31T10:31:00Z');
    expect(currentCadenceBucket(before)).not.toBe(currentCadenceBucket(after));
  });
});
