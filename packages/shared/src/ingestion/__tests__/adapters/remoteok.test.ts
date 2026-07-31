import { describe, it, expect } from 'vitest';
import { remoteOKAdapter } from '../../adapters/remoteok';
import type { RemoteOKRawJob } from '../../types';

const validRaw: RemoteOKRawJob = {
  id: 123456,
  position: 'Senior Backend Engineer',
  company: 'Acme Inc',
  description: `<p>${'We need a backend engineer with strong Node.js experience. '.repeat(3)}</p>`,
  tags: ['Node', 'TypeScript'],
  location: '🌍 Worldwide',
  url: 'https://remoteok.com/remote-jobs/123456',
  date: '2026-06-20T00:00:00+00:00',
  apply_url: 'https://acme.example.com/apply',
};

describe('remoteOKAdapter.normalize', () => {
  it('maps a valid raw job to NormalizedJob', () => {
    const result = remoteOKAdapter.normalize(validRaw);
    expect(result).not.toBeNull();
    expect(result?.externalId).toBe('123456');
    expect(result?.source).toBe('REMOTEOK');
    expect(result?.title).toBe('Senior Backend Engineer');
    expect(result?.company).toBe('Acme Inc');
    expect(result?.url).toBe('https://acme.example.com/apply');
    expect(result?.tags).toEqual(['node', 'typescript']);
    expect(result?.postedAt).toEqual(new Date('2026-06-20T00:00:00+00:00'));
  });

  it('returns null when id is missing', () => {
    const { id: _id, ...rest } = validRaw;
    expect(remoteOKAdapter.normalize(rest as RemoteOKRawJob)).toBeNull();
  });

  it('returns null when position is missing', () => {
    const { position: _position, ...rest } = validRaw;
    expect(remoteOKAdapter.normalize(rest as RemoteOKRawJob)).toBeNull();
  });

  it('strips HTML from the description', () => {
    const result = remoteOKAdapter.normalize(validRaw);
    expect(result?.description).not.toContain('<p>');
    expect(result?.description).toContain('We need a backend engineer');
  });

  it('returns null when description is too short after stripping HTML', () => {
    const result = remoteOKAdapter.normalize({ ...validRaw, description: '<p>short</p>' });
    expect(result).toBeNull();
  });

  it('defaults company to Unknown when missing', () => {
    const { company: _company, ...rest } = validRaw;
    const result = remoteOKAdapter.normalize(rest as RemoteOKRawJob);
    expect(result?.company).toBe('Unknown');
  });

  it('falls back to url when apply_url is missing', () => {
    const { apply_url: _applyUrl, ...rest } = validRaw;
    const result = remoteOKAdapter.normalize(rest as RemoteOKRawJob);
    expect(result?.url).toBe(validRaw.url);
  });
});
