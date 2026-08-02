export interface SalaryRangeResult {
  role: string;
  region: string;
  sampleSize: number;
  min: number | null;
  max: number | null;
  median: number | null;
  insufficientData: boolean;
}

const MIN_SAMPLE_SIZE = 10;

// Pure aggregation over pre-fetched, already-annualized salary figures (see
// normalizeToAnnualUSD in scoring/rule-score.ts — same "no currency
// conversion" assumption, caller is responsible for filtering to the
// requested role/region before calling this). mvp-scope.md/v2-scope.md §8
// Epic 11.2: below MIN_SAMPLE_SIZE, return "insufficient data" rather than a
// falsely precise number off a tiny sample.
export function getSalaryRange(
  role: string,
  region: string,
  annualSalaries: number[],
): SalaryRangeResult {
  if (annualSalaries.length < MIN_SAMPLE_SIZE) {
    return {
      role,
      region,
      sampleSize: annualSalaries.length,
      min: null,
      max: null,
      median: null,
      insufficientData: true,
    };
  }

  const sorted = [...annualSalaries].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;

  return {
    role,
    region,
    sampleSize: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    median,
    insufficientData: false,
  };
}
