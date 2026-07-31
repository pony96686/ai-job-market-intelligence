import { describe, it, expect } from 'vitest';
import { ashbyAdapter } from '../../adapters/ashby';

const validRaw = {
  company: 'acme',
  job: {
    id: 'job-42',
    title: 'Backend Engineer',
    location: 'Remote - US',
    descriptionHtml: `<p>${'Build our payments platform in Node.js and TypeScript. '.repeat(3)}</p>`,
    jobUrl: 'https://jobs.ashbyhq.com/acme/job-42',
    publishedAt: '2026-07-01T00:00:00Z',
  },
};

describe('ashbyAdapter.normalize', () => {
  it('maps a valid raw job to NormalizedJob using the ats_companies-registered company name', () => {
    const result = ashbyAdapter.normalize(validRaw);
    expect(result).not.toBeNull();
    expect(result?.externalId).toBe('job-42');
    expect(result?.source).toBe('ASHBY');
    expect(result?.company).toBe('acme');
    expect(result?.title).toBe('Backend Engineer');
    expect(result?.url).toBe(validRaw.job.jobUrl);
    expect(result?.location).toBe('Remote - US');
  });

  it('strips HTML from the description', () => {
    const result = ashbyAdapter.normalize(validRaw);
    expect(result?.description).not.toContain('<p>');
  });

  it('returns null when title is missing', () => {
    const raw = { company: 'acme', job: { ...validRaw.job, title: '' } };
    expect(ashbyAdapter.normalize(raw)).toBeNull();
  });

  it('returns null when description is too short after stripping HTML', () => {
    const raw = { company: 'acme', job: { ...validRaw.job, descriptionHtml: '<p>short</p>' } };
    expect(ashbyAdapter.normalize(raw)).toBeNull();
  });
});
