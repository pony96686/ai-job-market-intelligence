import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { commonCrawlDiscovery } from '../../company-discovery/common-crawl-discovery';

function ndjson(urls: string[]): string {
  return urls.map((url) => JSON.stringify({ url })).join('\n');
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

const COLLINFO = [
  { id: 'CC-MAIN-2026-30', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-30-index' },
  { id: 'CC-MAIN-2026-25', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-25-index' },
  { id: 'CC-MAIN-2026-21', 'cdx-api': 'https://index.commoncrawl.org/CC-MAIN-2026-21-index' },
];

describe('commonCrawlDiscovery', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queries collinfo.json then each recent crawl for the source domain(s), dedupes across crawls', async () => {
    fetchMock.mockImplementation((input: string | URL) => {
      const url = input.toString();
      if (url.includes('collinfo.json')) return Promise.resolve(jsonResponse(COLLINFO));
      if (url.includes('CC-MAIN-2026-30')) {
        return Promise.resolve(
          textResponse(ndjson(['https://boards.greenhouse.io/acme/jobs/1', 'https://boards.greenhouse.io/robots.txt'])),
        );
      }
      if (url.includes('CC-MAIN-2026-25')) {
        return Promise.resolve(textResponse(ndjson(['https://job-boards.greenhouse.io/acme/jobs/2'])));
      }
      return Promise.resolve(textResponse(''));
    });

    const result = await commonCrawlDiscovery('GREENHOUSE');

    expect(result).toEqual([{ source: 'GREENHOUSE', slug: 'acme' }]);
  });

  it('ignores non-matching sources and invalid slugs found in the response', async () => {
    fetchMock.mockImplementation((input: string | URL) => {
      const url = input.toString();
      if (url.includes('collinfo.json')) return Promise.resolve(jsonResponse(COLLINFO));
      if (url.includes('jobs.lever.co')) {
        return Promise.resolve(textResponse(ndjson(['https://jobs.lever.co/widgetco/abc', 'https://jobs.ashbyhq.com/other/xyz'])));
      }
      return Promise.resolve(textResponse(''));
    });

    const result = await commonCrawlDiscovery('LEVER');

    expect(result).toEqual([{ source: 'LEVER', slug: 'widgetco' }]);
  });

  it('treats a failed or slow query (e.g. 504 gateway timeout) as "found nothing", not an error', async () => {
    fetchMock.mockImplementation((input: string | URL) => {
      const url = input.toString();
      if (url.includes('collinfo.json')) return Promise.resolve(jsonResponse(COLLINFO));
      return Promise.resolve(textResponse('<html>504 Gateway Time-out</html>', 504));
    });

    await expect(commonCrawlDiscovery('ASHBY')).resolves.toEqual([]);
  });

  it('returns an empty result when collinfo.json itself is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(commonCrawlDiscovery('GREENHOUSE')).resolves.toEqual([]);
  });
});
