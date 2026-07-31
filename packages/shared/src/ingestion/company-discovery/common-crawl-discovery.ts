import { detectAtsSlug, type DetectedAtsCompany } from './url-detector';
import type { AtsSource } from '../../schemas/ats-company';

// The sole company discovery mechanism — no API key, no operator-supplied
// domain list, nothing to configure. Common Crawl publishes a free public web
// index; querying it for URLs under each ATS's job-board domain surfaces real
// company slugs without ever making a request to Greenhouse/Lever/Ashby/the
// target company itself.
const COLLINFO_URL = 'https://index.commoncrawl.org/collinfo.json';
const USER_AGENT = 'AI-Job-Market-Intelligence-CompanyDiscovery/1.0 (+company-discovery; Common Crawl Index Discovery)';
const REQUEST_INTERVAL_MS = 200; // Common Crawl is a shared public resource — throttle politely
const RECENT_CRAWLS_TO_QUERY = 3; // "most recent ~3 months", not the full history
// Confirmed empirically against the real CDX server: a `limit` much above
// this (e.g. 5000) reliably 504s for busy hosts like *.greenhouse.io — the
// server times out scanning its own index, not a client-side timeout.
const RESULTS_PER_QUERY = 1000;

// Domain patterns queried per ATS. Greenhouse has two live generations.
const DOMAINS_BY_SOURCE: Record<AtsSource, string[]> = {
  GREENHOUSE: ['boards.greenhouse.io', 'job-boards.greenhouse.io'],
  LEVER: ['jobs.lever.co'],
  ASHBY: ['jobs.ashbyhq.com'],
};

interface CollInfoEntry {
  id: string;
  'cdx-api': string;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// collinfo.json is already ordered newest-first; taking the first N avoids
// hardcoding a crawl id (which would go stale) while still bounding how much
// history a single run scans.
async function getRecentCrawls(count: number): Promise<CollInfoEntry[]> {
  try {
    const res = await fetch(COLLINFO_URL, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const entries = (await res.json()) as CollInfoEntry[];
    return entries.slice(0, count);
  } catch {
    return [];
  }
}

// Parses Common Crawl's CDX Index Server NDJSON response (one JSON object
// per line, each with a `url` field) into detected ATS company candidates.
// Any failure for a single (crawl id, domain) query — timeout, 5xx, a slow
// query the shared server gateway-times-out — is swallowed and treated as
// "found nothing this time", not a hard error: the weekly cadence and
// multiple crawl ids/domains mean coverage accumulates over time anyway.
async function queryCdxIndex(cdxApiUrl: string, domain: string): Promise<string[]> {
  const url = new URL(cdxApiUrl);
  url.searchParams.set('url', domain);
  url.searchParams.set('matchType', 'domain');
  url.searchParams.set('output', 'json');
  url.searchParams.set('filter', 'status:200');
  url.searchParams.set('limit', String(RESULTS_PER_QUERY));

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return [];

    const text = await res.text();
    const urls: string[] = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line) as { url?: string };
        if (record.url) urls.push(record.url);
      } catch {
        // malformed line — skip it, not worth failing the whole query over
      }
    }
    return urls;
  } catch {
    return [];
  }
}

// One call per ATS (GREENHOUSE/LEVER/ASHBY) — walks the most recent crawl
// snapshots x that ATS's domain pattern(s), extracting and deduplicating
// company slugs. Candidates still need official-API validation (see
// probe.ts) before being trusted — Common Crawl data can be stale or the
// company may no longer use that ATS.
export async function commonCrawlDiscovery(source: AtsSource): Promise<DetectedAtsCompany[]> {
  const crawls = await getRecentCrawls(RECENT_CRAWLS_TO_QUERY);
  const domains = DOMAINS_BY_SOURCE[source];
  const found = new Map<string, DetectedAtsCompany>();

  for (const crawl of crawls) {
    for (const domain of domains) {
      const urls = await queryCdxIndex(crawl['cdx-api'], domain);
      for (const url of urls) {
        const detected = detectAtsSlug(url);
        if (detected && detected.source === source) {
          found.set(detected.slug, detected);
        }
      }
      await sleep(REQUEST_INTERVAL_MS);
    }
  }

  return [...found.values()];
}
