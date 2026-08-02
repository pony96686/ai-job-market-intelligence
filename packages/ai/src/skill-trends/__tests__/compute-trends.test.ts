import { describe, it, expect } from 'vitest';
import { computeSkillTrendSnapshots, type JobSkillsRecord } from '../compute-trends';

const NOW = new Date('2026-08-02T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

function job(skills: string[], effectiveDate: Date): JobSkillsRecord {
  return { skills, effectiveDate };
}

describe('computeSkillTrendSnapshots', () => {
  it('counts absolute mentions within each window, always', () => {
    const jobs = [
      job(['typescript'], daysAgo(5)),
      job(['typescript'], daysAgo(20)),
      job(['typescript'], daysAgo(50)),
    ];

    const results = computeSkillTrendSnapshots(jobs, NOW);

    const w30 = results.find((r) => r.slug === 'typescript' && r.windowDays === 30);
    const w90 = results.find((r) => r.slug === 'typescript' && r.windowDays === 90);
    expect(w30?.jobCount).toBe(2); // 5 and 20 days ago, not 50
    expect(w90?.jobCount).toBe(3); // all three within 90 days
  });

  it('merges synonym variants into the same canonical slug and dedupes within a single job', () => {
    const jobs = [job(['js', 'javascript'], daysAgo(1))];

    const results = computeSkillTrendSnapshots(jobs, NOW);
    const w30 = results.filter((r) => r.windowDays === 30 && r.slug === 'javascript');

    expect(w30).toHaveLength(1);
    expect(w30[0]!.jobCount).toBe(1); // not 2 — same job, same canonical skill
    expect(w30[0]!.name).toBe('JavaScript');
  });

  it('returns null growthPercent when the current sample is below the minimum size', () => {
    // Only 5 jobs this window, plenty in the prior window — still null
    // because the *current* count is too small to be meaningful.
    const jobs = [
      ...Array.from({ length: 5 }, () => job(['rust'], daysAgo(10))),
      ...Array.from({ length: 30 }, () => job(['rust'], daysAgo(45))),
    ];

    const results = computeSkillTrendSnapshots(jobs, NOW);
    const w30 = results.find((r) => r.slug === 'rust' && r.windowDays === 30);

    expect(w30?.jobCount).toBe(5);
    expect(w30?.growthPercent).toBeNull();
  });

  it('returns null growthPercent when the prior window has no data', () => {
    const jobs = Array.from({ length: 25 }, () => job(['go'], daysAgo(10)));

    const results = computeSkillTrendSnapshots(jobs, NOW);
    const w30 = results.find((r) => r.slug === 'go' && r.windowDays === 30);

    expect(w30?.jobCount).toBe(25);
    expect(w30?.growthPercent).toBeNull();
  });

  it('computes a real growthPercent when both windows have enough data', () => {
    const jobs = [
      ...Array.from({ length: 40 }, () => job(['python'], daysAgo(10))), // current window
      ...Array.from({ length: 20 }, () => job(['python'], daysAgo(45))), // prior window
    ];

    const results = computeSkillTrendSnapshots(jobs, NOW);
    const w30 = results.find((r) => r.slug === 'python' && r.windowDays === 30);

    expect(w30?.jobCount).toBe(40);
    expect(w30?.growthPercent).toBe(100); // (40-20)/20 * 100
  });

  it('excludes jobs outside both the current and prior window', () => {
    const jobs = [job(['ruby'], daysAgo(400))]; // outside even the 365-day window's prior period

    const results = computeSkillTrendSnapshots(jobs, NOW);
    expect(results.find((r) => r.slug === 'ruby')).toBeUndefined();
  });

  it('includes a job posted later today, after midnight but before "now"', () => {
    // NOW is 2026-08-02T12:00:00Z — a job posted at 2026-08-02T09:00:00Z is
    // "today" and must count, even though periodEnd is truncated to midnight.
    const postedEarlierToday = new Date('2026-08-02T09:00:00Z');
    const results = computeSkillTrendSnapshots([job(['go'], postedEarlierToday)], NOW);

    const w30 = results.find((r) => r.slug === 'go' && r.windowDays === 30);
    expect(w30?.jobCount).toBe(1);
  });

  it('truncates periodEnd to the start of the UTC day', () => {
    const results = computeSkillTrendSnapshots([job(['go'], daysAgo(1))], NOW);
    const periodEnd = results[0]!.periodEnd;
    expect(periodEnd.toISOString()).toBe('2026-08-02T00:00:00.000Z');
  });
});
