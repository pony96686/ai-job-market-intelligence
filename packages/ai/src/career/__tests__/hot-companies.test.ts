import { describe, it, expect } from 'vitest';
import { getHotCompanies, type HotCompanyRecentJob } from '../hot-companies';

const NOW = new Date('2026-08-02T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

function recentJob(company: string, days: number): HotCompanyRecentJob {
  return { company, effectiveDate: daysAgo(days) };
}

describe('getHotCompanies', () => {
  it('ranks by current active job count, always available regardless of growth data', () => {
    const activeJobs = [
      { company: 'Acme' },
      { company: 'Acme' },
      { company: 'Acme' },
      { company: 'Globex' },
    ];

    const results = getHotCompanies(activeJobs, [], NOW, 10);

    expect(results[0]).toMatchObject({ company: 'Acme', activeJobCount: 3, growthPercent: null });
    expect(results[1]).toMatchObject({ company: 'Globex', activeJobCount: 1, growthPercent: null });
  });

  it('respects the limit', () => {
    const activeJobs = [{ company: 'A' }, { company: 'B' }, { company: 'C' }];

    const results = getHotCompanies(activeJobs, [], NOW, 2);

    expect(results).toHaveLength(2);
  });

  it('returns null growthPercent when the current window sample is below the minimum', () => {
    const activeJobs = [{ company: 'Acme' }];
    const recentJobs = [
      ...Array.from({ length: 3 }, () => recentJob('Acme', 10)), // below MIN_SAMPLE_SIZE (5)
      ...Array.from({ length: 20 }, () => recentJob('Acme', 45)),
    ];

    const results = getHotCompanies(activeJobs, recentJobs, NOW, 10);

    expect(results[0]!.growthPercent).toBeNull();
  });

  it('computes growthPercent once both windows have enough sample size', () => {
    const activeJobs = [{ company: 'Acme' }];
    const recentJobs = [
      ...Array.from({ length: 10 }, () => recentJob('Acme', 10)), // current window
      ...Array.from({ length: 5 }, () => recentJob('Acme', 45)), // previous window
    ];

    const results = getHotCompanies(activeJobs, recentJobs, NOW, 10);

    expect(results[0]!.growthPercent).toBe(100); // 10 vs 5 = +100%
  });

  it('returns null growthPercent when the previous window has no data at all', () => {
    const activeJobs = [{ company: 'Acme' }];
    const recentJobs = Array.from({ length: 10 }, () => recentJob('Acme', 10));

    const results = getHotCompanies(activeJobs, recentJobs, NOW, 10);

    expect(results[0]!.growthPercent).toBeNull();
  });
});
