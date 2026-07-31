import { describe, it, expect } from 'vitest';
import { leverAdapter } from '../../adapters/lever';

const validRaw = {
  company: 'widgetco',
  job: {
    id: 'abc-123',
    text: 'Full-stack Engineer',
    categories: { location: 'Remote', team: 'Engineering' },
    descriptionPlain: 'Own features end to end across our TypeScript monorepo and React frontend.',
    hostedUrl: 'https://jobs.lever.co/widgetco/abc-123',
    createdAt: 1735689600000,
  },
};

describe('leverAdapter.normalize', () => {
  it('maps a valid raw job to NormalizedJob using the whitelisted company name', () => {
    const result = leverAdapter.normalize(validRaw);
    expect(result).not.toBeNull();
    expect(result?.externalId).toBe('abc-123');
    expect(result?.source).toBe('LEVER');
    expect(result?.company).toBe('widgetco');
    expect(result?.title).toBe('Full-stack Engineer');
    expect(result?.url).toBe(validRaw.job.hostedUrl);
    expect(result?.location).toBe('Remote');
    expect(result?.tags).toEqual(['engineering']);
    expect(result?.postedAt).toEqual(new Date(1735689600000));
  });

  it('returns null when text (title) is missing', () => {
    const raw = { company: 'widgetco', job: { ...validRaw.job, text: '' } };
    expect(leverAdapter.normalize(raw)).toBeNull();
  });

  it('returns null when description is too short', () => {
    const raw = { company: 'widgetco', job: { ...validRaw.job, descriptionPlain: 'short' } };
    expect(leverAdapter.normalize(raw)).toBeNull();
  });
});
