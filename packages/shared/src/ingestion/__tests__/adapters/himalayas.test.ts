import { describe, it, expect } from 'vitest';
import { himalayasAdapter } from '../../adapters/himalayas';

const validRaw = {
  guid: 'himalayas-123',
  title: 'Senior Backend Engineer',
  description: `<p>${'We need a backend engineer with strong Node.js experience. '.repeat(3)}</p>`,
  companyName: 'Acme Inc',
  minSalary: 140_000,
  maxSalary: 180_000,
  salaryPeriod: 'annual' as const,
  currency: 'USD',
  seniority: ['Senior'],
  locationRestrictions: ['Worldwide'],
  categories: ['Node.js', 'TypeScript'],
  pubDate: 1750377600, // 2025-06-20T00:00:00Z
  applicationLink: 'https://acme.example.com/apply',
};

describe('himalayasAdapter.normalize', () => {
  it('maps a valid raw job to NormalizedJob with sourceStructured=true', () => {
    const result = himalayasAdapter.normalize(validRaw);
    expect(result).not.toBeNull();
    expect(result?.externalId).toBe('himalayas-123');
    expect(result?.source).toBe('HIMALAYAS');
    expect(result?.title).toBe('Senior Backend Engineer');
    expect(result?.company).toBe('Acme Inc');
    expect(result?.sourceStructured).toBe(true);
    expect(result?.salaryMin).toBe(140_000);
    expect(result?.salaryMax).toBe(180_000);
    expect(result?.salaryCurrency).toBe('USD');
    expect(result?.salaryPeriod).toBe('ANNUAL');
    expect(result?.seniority).toBe('Senior');
  });

  it('strips HTML from the description', () => {
    const result = himalayasAdapter.normalize(validRaw);
    expect(result?.description).not.toContain('<p>');
    expect(result?.description).toContain('We need a backend engineer');
  });

  it('returns null when guid is missing', () => {
    const { guid: _guid, ...rest } = validRaw;
    expect(himalayasAdapter.normalize(rest)).toBeNull();
  });

  it('returns null when title is missing', () => {
    const { title: _title, ...rest } = validRaw;
    expect(himalayasAdapter.normalize(rest)).toBeNull();
  });

  it('returns null when description is too short', () => {
    const result = himalayasAdapter.normalize({ ...validRaw, description: 'short' });
    expect(result).toBeNull();
  });

  it('defaults location to Remote when no restrictions are given', () => {
    const { locationRestrictions: _loc, ...rest } = validRaw;
    const result = himalayasAdapter.normalize(rest);
    expect(result?.location).toBe('Remote');
  });

  it('leaves salaryPeriod undefined when the source omits it', () => {
    const { salaryPeriod: _period, ...rest } = validRaw;
    const result = himalayasAdapter.normalize({ ...rest, salaryPeriod: null });
    expect(result?.salaryPeriod).toBeUndefined();
  });
});
