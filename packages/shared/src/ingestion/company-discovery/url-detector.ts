import type { AtsSource } from '../../schemas/ats-company';

export interface DetectedAtsCompany {
  source: AtsSource;
  slug: string;
}

// Domain pattern matching used to classify a URL found via Common Crawl
// Index Discovery and pull out its ATS company slug. Greenhouse has two live
// domain generations, both still in use.
const URL_PATTERNS: { source: AtsSource; pattern: RegExp }[] = [
  { source: 'GREENHOUSE', pattern: /boards\.greenhouse\.io\/([^/?#]+)/i },
  { source: 'GREENHOUSE', pattern: /job-boards\.greenhouse\.io\/([^/?#]+)/i },
  { source: 'LEVER', pattern: /jobs\.lever\.co\/([^/?#]+)/i },
  { source: 'ASHBY', pattern: /jobs\.ashbyhq\.com\/([^/?#]+)/i },
];

// Real Common Crawl results include plenty of non-company paths under these
// hosts (robots.txt, favicon.ico, tracking-pixel query artifacts with stray
// punctuation) — a real company slug is alphanumeric/hyphen only.
const VALID_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/i;

export function detectAtsSlug(url: string): DetectedAtsCompany | null {
  for (const { source, pattern } of URL_PATTERNS) {
    const match = pattern.exec(url);
    const slug = match?.[1];
    if (slug && VALID_SLUG_PATTERN.test(slug)) {
      return { source, slug };
    }
  }
  return null;
}
