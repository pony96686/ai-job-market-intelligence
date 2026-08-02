import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFindManyUsers, mockQueueAdd } = vi.hoisted(() => ({
  mockFindManyUsers: vi.fn(),
  mockQueueAdd: vi.fn(),
}));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: { user: { findMany: mockFindManyUsers } },
}));

vi.mock('@ai-job-market-intelligence/shared/queue', () => ({
  getCareerBriefGenerateQueue: () => ({ add: mockQueueAdd }),
  CAREER_BRIEF_GENERATE_JOB_OPTS: {},
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { processCareerAgentDaily } from '../career-agent-daily';

function makeJob() {
  return { id: 'career-agent-daily-cron' } as never;
}

beforeEach(() => {
  mockFindManyUsers.mockReset();
  mockQueueAdd.mockReset();
});

describe('processCareerAgentDaily', () => {
  it('only enqueues for onboarded users with dailyBriefEnabled', async () => {
    mockFindManyUsers.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);

    await processCareerAgentDaily(makeJob());

    expect(mockFindManyUsers).toHaveBeenCalledWith({
      where: { onboardingCompleted: true, dailyBriefEnabled: true },
      select: { id: true },
    });
    expect(mockQueueAdd).toHaveBeenCalledTimes(2);
  });

  it('enqueues each user with a date-scoped idempotent jobId', async () => {
    mockFindManyUsers.mockResolvedValue([{ id: 'user-1' }]);

    await processCareerAgentDaily(makeJob());

    expect(mockQueueAdd).toHaveBeenCalledWith(
      'generate',
      { userId: 'user-1' },
      expect.objectContaining({
        jobId: expect.stringMatching(/^career-brief:user-1:\d{4}-\d{2}-\d{2}$/),
      }),
    );
  });

  it('does nothing when no user is eligible', async () => {
    mockFindManyUsers.mockResolvedValue([]);

    await processCareerAgentDaily(makeJob());

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });
});
