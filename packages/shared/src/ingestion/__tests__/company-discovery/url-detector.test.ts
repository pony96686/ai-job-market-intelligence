import { describe, it, expect } from 'vitest';
import { detectAtsSlug } from '../../company-discovery/url-detector';

describe('detectAtsSlug', () => {
  it('detects legacy Greenhouse board URLs', () => {
    expect(detectAtsSlug('https://boards.greenhouse.io/acme/jobs/123')).toEqual({
      source: 'GREENHOUSE',
      slug: 'acme',
    });
  });

  it('detects new-generation Greenhouse job-boards URLs', () => {
    expect(detectAtsSlug('https://job-boards.greenhouse.io/widgetco/jobs/456')).toEqual({
      source: 'GREENHOUSE',
      slug: 'widgetco',
    });
  });

  it('detects Lever URLs', () => {
    expect(detectAtsSlug('https://jobs.lever.co/widgetco/abc-123')).toEqual({
      source: 'LEVER',
      slug: 'widgetco',
    });
  });

  it('detects Ashby URLs', () => {
    expect(detectAtsSlug('https://jobs.ashbyhq.com/acme/def-456')).toEqual({
      source: 'ASHBY',
      slug: 'acme',
    });
  });

  it('returns null for unrelated URLs', () => {
    expect(detectAtsSlug('https://linkedin.com/jobs/view/123')).toBeNull();
  });

  it('rejects non-company paths like robots.txt (real Common Crawl noise)', () => {
    expect(detectAtsSlug('https://boards.greenhouse.io/robots.txt')).toBeNull();
  });

  it('rejects slugs with stray punctuation (real Common Crawl noise)', () => {
    expect(detectAtsSlug('https://job-boards.greenhouse.io/1pyra)mid_health&care/jobs/1')).toBeNull();
  });
});
