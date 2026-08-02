import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindManyJobs, mockSkillUpsert, mockSnapshotUpsert } = vi.hoisted(() => ({
  mockFindManyJobs: vi.fn(),
  mockSkillUpsert: vi.fn(),
  mockSnapshotUpsert: vi.fn(),
}));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    job: { findMany: mockFindManyJobs },
    skill: { upsert: mockSkillUpsert },
    skillTrendSnapshot: { upsert: mockSnapshotUpsert },
  },
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { processSkillTrendAggregate } from '../skill-trend-aggregate';

function makeJob() {
  return { id: 'skill-trend-aggregate-cron' } as never;
}

beforeEach(() => {
  mockFindManyJobs.mockReset();
  mockSkillUpsert.mockReset();
  mockSnapshotUpsert.mockReset();

  mockFindManyJobs.mockResolvedValue([
    { skills: ['typescript'], postedAt: new Date(), createdAt: new Date() },
    { skills: ['typescript'], postedAt: null, createdAt: new Date() },
  ]);
  mockSkillUpsert.mockImplementation(({ where }: { where: { slug: string } }) =>
    Promise.resolve({ id: `skill-${where.slug}`, slug: where.slug }),
  );
  mockSnapshotUpsert.mockResolvedValue({});
});

describe('processSkillTrendAggregate', () => {
  it('only scans ACTIVE jobs with non-empty skills', async () => {
    await processSkillTrendAggregate(makeJob());

    expect(mockFindManyJobs).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', skills: { isEmpty: false } },
      select: { skills: true, postedAt: true, createdAt: true },
    });
  });

  it('falls back to createdAt when postedAt is null', async () => {
    await processSkillTrendAggregate(makeJob());

    // Both fixture jobs have the same skill, one with postedAt=null — both
    // should still count toward the same 2-job total for the 30-day window.
    const call = mockSnapshotUpsert.mock.calls.find(([args]) => args.create.windowDays === 30);
    expect(call?.[0].create.jobCount).toBe(2);
  });

  it('upserts one Skill row per distinct canonical slug', async () => {
    await processSkillTrendAggregate(makeJob());

    expect(mockSkillUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'typescript' },
        create: { slug: 'typescript', name: 'TypeScript' },
      }),
    );
  });

  it('upserts a SkillTrendSnapshot for each of the 30/90/365 windows', async () => {
    await processSkillTrendAggregate(makeJob());

    const windowsWritten = mockSnapshotUpsert.mock.calls
      .map(([args]) => args.create.windowDays)
      .sort((a, b) => a - b);
    expect(windowsWritten).toEqual([30, 90, 365]);
  });

  it('does nothing when there are no ACTIVE jobs with skills', async () => {
    mockFindManyJobs.mockResolvedValue([]);

    await processSkillTrendAggregate(makeJob());

    expect(mockSkillUpsert).not.toHaveBeenCalled();
    expect(mockSnapshotUpsert).not.toHaveBeenCalled();
  });
});
