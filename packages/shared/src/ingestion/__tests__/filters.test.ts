import { describe, it, expect } from 'vitest';
import { passesFilter } from '../filters';
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
    expect(passesFilter(makeJob({ source: 'GREENHOUSE', location: 'San Francisco, CA' }))).toBe(false);
  });

  it('bypasses the remote-keyword check for remote-only job boards (RemoteOK/Himalayas)', () => {
    expect(passesFilter(makeJob({ source: 'REMOTEOK', location: 'San Francisco, CA' }))).toBe(true);
    expect(passesFilter(makeJob({ source: 'HIMALAYAS', location: 'San Francisco, CA' }))).toBe(true);
  });

  it('rejects jobs with excluded tags', () => {
    expect(passesFilter(makeJob({ tags: ['marketing'] }))).toBe(false);
  });

  it('rejects titles shorter than 3 characters', () => {
    expect(passesFilter(makeJob({ title: 'X' }))).toBe(false);
  });

  it('accepts a job with no postedAt', () => {
    expect(passesFilter(makeJob({ postedAt: null }))).toBe(true);
  });
});
