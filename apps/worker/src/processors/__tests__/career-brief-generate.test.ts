import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockFindProfile,
  mockFindFirstSnapshot,
  mockFindManySnapshots,
  mockFindManyJobs,
  mockFindManyScores,
  mockUpsertBrief,
  mockFindUser,
} = vi.hoisted(() => ({
  mockFindProfile: vi.fn(),
  mockFindFirstSnapshot: vi.fn(),
  mockFindManySnapshots: vi.fn(),
  mockFindManyJobs: vi.fn(),
  mockFindManyScores: vi.fn(),
  mockUpsertBrief: vi.fn(),
  mockFindUser: vi.fn(),
}));

const { mockEmailsSend } = vi.hoisted(() => ({ mockEmailsSend: vi.fn() }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    userProfile: { findUniqueOrThrow: mockFindProfile },
    skillTrendSnapshot: { findFirst: mockFindFirstSnapshot, findMany: mockFindManySnapshots },
    job: { findMany: mockFindManyJobs },
    jobScore: { findMany: mockFindManyScores },
    careerBrief: { upsert: mockUpsertBrief },
    user: { findUniqueOrThrow: mockFindUser },
  },
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: mockEmailsSend } })),
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { processCareerBriefGenerate } from '../career-brief-generate';

function makeJob(userId: string) {
  return { id: `career-brief:${userId}:2026-08-02`, data: { userId } } as never;
}

beforeEach(() => {
  mockFindProfile.mockReset();
  mockFindFirstSnapshot.mockReset();
  mockFindManySnapshots.mockReset();
  mockFindManyJobs.mockReset();
  mockFindManyScores.mockReset();
  mockUpsertBrief.mockReset();
  mockFindUser.mockReset();
  mockEmailsSend.mockReset();

  mockFindProfile.mockResolvedValue({ userId: 'user-1', skills: ['python'] });
  mockFindFirstSnapshot.mockResolvedValue({ periodEnd: new Date('2026-08-02T00:00:00Z') });
  mockFindManySnapshots.mockResolvedValue([
    { jobCount: 20, growthPercent: 50, skill: { slug: 'rust', name: 'Rust' } },
  ]);
  mockFindManyJobs.mockResolvedValue([]); // active/recent companies + per-role candidate jobs
  mockFindManyScores.mockResolvedValue([]);
  mockUpsertBrief.mockResolvedValue({});
  mockFindUser.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
  mockEmailsSend.mockResolvedValue({ error: null });
});

describe('processCareerBriefGenerate', () => {
  it('upserts a CareerBrief scoped to (userId, briefDate)', async () => {
    await processCareerBriefGenerate(makeJob('user-1'));

    expect(mockUpsertBrief).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_briefDate: { userId: 'user-1', briefDate: expect.any(Date) } },
      }),
    );
  });

  it('includes the top growing skill in the summary market highlights', async () => {
    await processCareerBriefGenerate(makeJob('user-1'));

    const call = mockUpsertBrief.mock.calls[0]![0];
    expect(call.create.summary.marketHighlights.topGrowingSkills).toEqual([
      { slug: 'rust', name: 'Rust', jobCount: 20, growthPercent: 50 },
    ]);
  });

  it('includes high-scoring recent job scores as recommended jobs', async () => {
    mockFindManyScores.mockResolvedValue([
      { score: 90, job: { id: 'job-1', title: 'Backend Engineer', company: 'Acme' } },
    ]);

    await processCareerBriefGenerate(makeJob('user-1'));

    const call = mockUpsertBrief.mock.calls[0]![0];
    expect(call.create.summary.recommendedJobs).toEqual([
      { jobId: 'job-1', title: 'Backend Engineer', company: 'Acme', score: 90 },
    ]);
  });

  it('queries jobScore with the Opportunity Discovery threshold and 24h window', async () => {
    await processCareerBriefGenerate(makeJob('user-1'));

    expect(mockFindManyScores).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          score: { gte: 85 },
          createdAt: { gte: expect.any(Date) },
        }),
      }),
    );
  });

  it('sends the brief email to the user', async () => {
    await processCareerBriefGenerate(makeJob('user-1'));

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
  });

  it('throws (for BullMQ retry) when the email fails to send', async () => {
    mockEmailsSend.mockResolvedValue({ error: { message: 'Resend down' } });

    await expect(processCareerBriefGenerate(makeJob('user-1'))).rejects.toThrow('Resend down');
  });

  it('still upserts the brief before attempting to send email (visible in-app even if email fails)', async () => {
    mockEmailsSend.mockResolvedValue({ error: { message: 'Resend down' } });

    await expect(processCareerBriefGenerate(makeJob('user-1'))).rejects.toThrow();

    expect(mockUpsertBrief).toHaveBeenCalled();
  });
});
