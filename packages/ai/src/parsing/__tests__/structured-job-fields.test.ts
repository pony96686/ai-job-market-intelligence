import { describe, it, expect } from 'vitest';
import { buildStructuredJobFields, mapSeniority, extractTagsAsSkills } from '../structured-job-fields';
import type { NormalizedJob } from '@ai-job-market-intelligence/shared/ingestion';

const baseNormalized: NormalizedJob = {
  externalId: 'himalayas-1',
  source: 'HIMALAYAS',
  title: 'Senior Backend Engineer',
  company: 'Acme Inc',
  description: 'Some description',
  url: 'https://acme.example.com/apply',
  location: 'Remote',
  tags: ['Node.js', 'TypeScript', 'node.js'],
  postedAt: null,
  salaryMin: 140_000,
  salaryMax: 180_000,
  seniority: 'Senior',
};

describe('mapSeniority', () => {
  it('maps known seniority strings to JobLevel', () => {
    expect(mapSeniority('Senior')).toBe('Senior');
    expect(mapSeniority('entry-level')).toBe('Junior');
    expect(mapSeniority('Lead')).toBe('Staff');
    expect(mapSeniority('Principal')).toBe('Principal');
  });

  it('returns Unknown for unrecognized or missing values', () => {
    expect(mapSeniority('something-weird')).toBe('Unknown');
    expect(mapSeniority(undefined)).toBe('Unknown');
  });
});

describe('extractTagsAsSkills', () => {
  it('lowercases, trims and deduplicates tags', () => {
    expect(extractTagsAsSkills(['Node.js', 'TypeScript', 'node.js', ' '])).toEqual(['node.js', 'typescript']);
  });
});

describe('buildStructuredJobFields', () => {
  it('builds ParsedJobFields directly from source-native fields without calling an LLM', () => {
    const result = buildStructuredJobFields(baseNormalized);
    expect(result.role).toBe('Senior Backend Engineer');
    expect(result.level).toBe('Senior');
    expect(result.skills).toEqual(['node.js', 'typescript']);
    expect(result.salaryMin).toBe(140_000);
    expect(result.salaryMax).toBe(180_000);
    expect(result.remote).toBe(true);
    expect(result.confidence).toBe(1.0);
  });
});
