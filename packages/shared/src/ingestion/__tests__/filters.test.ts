import { describe, it, expect } from 'vitest';
import { passesFilter, hasExcludedTag, hasExcludedTitleKeyword } from '../filters';
import type { NormalizedJob } from '../types';

function makeJob(overrides: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    externalId: '1',
    source: 'REMOTEOK',
    title: 'Senior Backend Engineer',
    company: 'Acme',
    description: 'A'.repeat(100),
    url: 'https://example.com/1',
    location: 'Remote',
    tags: ['node'],
    postedAt: new Date(),
    ...overrides,
  };
}

describe('passesFilter', () => {
  it('passes a valid remote job', () => {
    expect(passesFilter(makeJob())).toBe(true);
  });

  it('rejects a job posted more than 90 days ago', () => {
    const old = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
    expect(passesFilter(makeJob({ postedAt: old }))).toBe(false);
  });

  it('rejects onsite-only locations for career-board sources', () => {
    expect(passesFilter(makeJob({ source: 'GREENHOUSE', location: 'San Francisco, CA' }))).toBe(
      false,
    );
  });

  it('bypasses the remote-keyword check for remote-only job boards (RemoteOK/Himalayas)', () => {
    expect(passesFilter(makeJob({ source: 'REMOTEOK', location: 'San Francisco, CA' }))).toBe(true);
    expect(passesFilter(makeJob({ source: 'HIMALAYAS', location: 'San Francisco, CA' }))).toBe(
      true,
    );
  });

  it('rejects jobs with excluded tags', () => {
    expect(passesFilter(makeJob({ tags: ['marketing'] }))).toBe(false);
  });

  it('rejects excluded tags regardless of case (e.g. source-provided "B2B-Sales")', () => {
    expect(passesFilter(makeJob({ tags: ['B2B-Sales'] }))).toBe(false);
    expect(passesFilter(makeJob({ tags: ['Enterprise-Sales'] }))).toBe(false);
    expect(passesFilter(makeJob({ tags: ['Business-Development'] }))).toBe(false);
  });

  it('rejects non-tech categories that previously slipped through (healthcare/medical/radiology)', () => {
    expect(passesFilter(makeJob({ tags: ['Radiology'] }))).toBe(false);
    expect(passesFilter(makeJob({ tags: ['Healthcare'] }))).toBe(false);
    expect(passesFilter(makeJob({ tags: ['Medical'] }))).toBe(false);
  });

  it('rejects titles shorter than 3 characters', () => {
    expect(passesFilter(makeJob({ title: 'X' }))).toBe(false);
  });

  it('accepts a job with no postedAt', () => {
    expect(passesFilter(makeJob({ postedAt: null }))).toBe(true);
  });

  // Greenhouse/Lever/Ashby never provide native tags, so this is the only
  // signal F6 has for them — real-world examples pulled from an Ashby data
  // quality audit.
  it('rejects non-tech titles even with empty tags (Greenhouse/Lever/Ashby have none natively)', () => {
    expect(
      passesFilter(makeJob({ source: 'ASHBY', tags: [], title: 'Strategic Finance Lead' })),
    ).toBe(false);
    expect(
      passesFilter(makeJob({ source: 'ASHBY', tags: [], title: 'Sr. Sales Enablement Manager' })),
    ).toBe(false);
    expect(
      passesFilter(
        makeJob({ source: 'ASHBY', tags: [], title: 'Chief of Staff, Care Transformation' }),
      ),
    ).toBe(false);
    expect(passesFilter(makeJob({ source: 'ASHBY', tags: [], title: 'Product Designer' }))).toBe(
      false,
    );
  });

  it('does not false-positive on legitimate engineering titles containing "design"', () => {
    expect(
      passesFilter(makeJob({ source: 'ASHBY', tags: [], title: 'Design Systems Engineer' })),
    ).toBe(true);
    expect(
      passesFilter(makeJob({ source: 'ASHBY', tags: [], title: 'Software Design Engineer' })),
    ).toBe(true);
  });
});

// Exported for reuse by the one-time backfill script
// (apps/worker/scripts/backfill-remove-nontech-jobs.ts), which re-checks
// already-ingested jobs' tags against this same rule.
describe('hasExcludedTag', () => {
  it('matches case-insensitively', () => {
    expect(hasExcludedTag(['Radiology'])).toBe(true);
    expect(hasExcludedTag(['node', 'typescript'])).toBe(false);
  });
});

// Exported for reuse by the one-time backfill script
// (apps/worker/scripts/backfill-remove-nontech-titles.ts).
describe('hasExcludedTitleKeyword', () => {
  it('matches on word boundaries, case-insensitively', () => {
    expect(hasExcludedTitleKeyword('Head of Viral Social')).toBe(false); // "social" alone isn't listed
    expect(hasExcludedTitleKeyword('Social Media Manager')).toBe(true);
    expect(hasExcludedTitleKeyword('SALES Engineer')).toBe(true);
  });

  it('does not match "designer" as a substring of an unrelated word', () => {
    expect(hasExcludedTitleKeyword('Redesigner')).toBe(false);
  });

  it('returns false for ordinary engineering titles', () => {
    expect(hasExcludedTitleKeyword('Senior Backend Engineer')).toBe(false);
  });
});
