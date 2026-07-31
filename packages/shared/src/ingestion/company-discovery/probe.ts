import type { AtsSource } from '../../schemas/ats-company';

const PROBE_URL: Record<AtsSource, (slug: string) => string> = {
  GREENHOUSE: (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`,
  LEVER: (slug) => `https://api.lever.co/v0/postings/${slug}?mode=json`,
  ASHBY: (slug) => `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
};

// Confirms a candidate slug against the ATS's own official (already-approved
// Tier-1) API — this is the only step that actually registers a company,
// both for Company Discovery and for the per-company failure tracking in
// ingestion_collect. Deliberately returns a plain boolean, not job data: a
// 200 with zero open roles ("zombie board") is still a valid, ACTIVE company.
export async function probeOfficialApi(source: AtsSource, slug: string): Promise<boolean> {
  try {
    const res = await fetch(PROBE_URL[source](slug), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
