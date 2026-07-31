import { describe, it, expect } from 'vitest';
import { greenhouseAdapter } from '../../adapters/greenhouse';

const validRaw = {
  company: 'acme',
  job: {
    id: 42,
    title: 'Backend Engineer',
    location: { name: 'Remote - US' },
    content: `<p>${'Build our payments platform in Node.js and TypeScript. '.repeat(3)}</p>`,
    absolute_url: 'https://boards.greenhouse.io/acme/jobs/42',
    updated_at: '2026-07-01T00:00:00Z',
  },
};

describe('greenhouseAdapter.normalize', () => {
  it('maps a valid raw job to NormalizedJob using the whitelisted company name', () => {
    const result = greenhouseAdapter.normalize(validRaw);
    expect(result).not.toBeNull();
    expect(result?.externalId).toBe('42');
    expect(result?.source).toBe('GREENHOUSE');
    expect(result?.company).toBe('acme');
    expect(result?.title).toBe('Backend Engineer');
    expect(result?.url).toBe(validRaw.job.absolute_url);
    expect(result?.location).toBe('Remote - US');
  });

  it('strips HTML from the description', () => {
    const result = greenhouseAdapter.normalize(validRaw);
    expect(result?.description).not.toContain('<p>');
  });

  it('returns null when title is missing', () => {
    const raw = { company: 'acme', job: { ...validRaw.job, title: '' } };
    expect(greenhouseAdapter.normalize(raw)).toBeNull();
  });

  it('returns null when description is too short after stripping HTML', () => {
    const raw = { company: 'acme', job: { ...validRaw.job, content: '<p>short</p>' } };
    expect(greenhouseAdapter.normalize(raw)).toBeNull();
  });
});
