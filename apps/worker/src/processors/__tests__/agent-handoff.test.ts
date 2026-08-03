import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockFindFirstHandoff,
  mockCreateHandoff,
  mockUpdateHandoff,
  mockFindJob,
  mockFindManyMessages,
  mockCreateMessage,
} = vi.hoisted(() => ({
  mockFindFirstHandoff: vi.fn(),
  mockCreateHandoff: vi.fn(),
  mockUpdateHandoff: vi.fn(),
  mockFindJob: vi.fn(),
  mockFindManyMessages: vi.fn(),
  mockCreateMessage: vi.fn(),
}));

const { mockCreateToolExecutor } = vi.hoisted(() => ({
  mockCreateToolExecutor: vi.fn(() => vi.fn()),
}));

const { mockRunCareerCoachTurn } = vi.hoisted(() => ({
  mockRunCareerCoachTurn: vi.fn(),
}));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    agentHandoff: {
      findFirst: mockFindFirstHandoff,
      create: mockCreateHandoff,
      update: mockUpdateHandoff,
    },
    job: { findUniqueOrThrow: mockFindJob },
    careerCoachMessage: { findMany: mockFindManyMessages, create: mockCreateMessage },
  },
  createCareerCoachToolExecutor: mockCreateToolExecutor,
}));

vi.mock('@ai-job-market-intelligence/ai', () => ({
  runCareerCoachTurn: mockRunCareerCoachTurn,
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { processAgentHandoff } from '../agent-handoff';

function makeJob(data: { jobId: string; userId: string; matchScore: number }) {
  return { id: `handoff:${data.jobId}:${data.userId}`, data } as never;
}

beforeEach(() => {
  mockFindFirstHandoff.mockReset();
  mockCreateHandoff.mockReset();
  mockUpdateHandoff.mockReset();
  mockFindJob.mockReset();
  mockFindManyMessages.mockReset();
  mockCreateMessage.mockReset();
  mockCreateToolExecutor.mockReset().mockReturnValue(vi.fn());
  mockRunCareerCoachTurn.mockReset();

  mockFindFirstHandoff.mockResolvedValue(null);
  mockFindJob.mockResolvedValue({ id: 'job-1', title: 'Senior Backend Engineer', company: 'Acme' });
  mockCreateHandoff.mockResolvedValue({ id: 'handoff-1' });
  mockFindManyMessages.mockResolvedValue([]);
  mockRunCareerCoachTurn.mockResolvedValue(
    'I noticed a 94% match for you: Senior Backend Engineer at Acme!',
  );
});

describe('processAgentHandoff', () => {
  it('skips entirely when a handoff for this (userId, jobId) was already consumed', async () => {
    mockFindFirstHandoff.mockResolvedValue({ id: 'handoff-1', consumedAt: new Date() });

    await processAgentHandoff(makeJob({ jobId: 'job-1', userId: 'user-1', matchScore: 94 }));

    expect(mockCreateHandoff).not.toHaveBeenCalled();
    expect(mockRunCareerCoachTurn).not.toHaveBeenCalled();
  });

  it('resumes a pending handoff (consumedAt null) from a prior failed attempt instead of creating a duplicate', async () => {
    mockFindFirstHandoff.mockResolvedValue({
      id: 'existing-handoff',
      consumedAt: null,
      context: { jobId: 'job-1', matchScore: 94, reason: 'score >= 90 threshold (94)' },
    });

    await processAgentHandoff(makeJob({ jobId: 'job-1', userId: 'user-1', matchScore: 94 }));

    expect(mockCreateHandoff).not.toHaveBeenCalled();
    expect(mockUpdateHandoff).toHaveBeenCalledWith({
      where: { id: 'existing-handoff' },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it('creates a new handoff, generates an opener via Career Coach, persists it, and marks consumed', async () => {
    await processAgentHandoff(makeJob({ jobId: 'job-1', userId: 'user-1', matchScore: 94 }));

    expect(mockCreateHandoff).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        fromAgent: 'OPPORTUNITY_DISCOVERY',
        toAgent: 'CAREER_COACH',
        context: { jobId: 'job-1', matchScore: 94, reason: expect.stringContaining('94') },
      },
    });

    expect(mockCreateToolExecutor).toHaveBeenCalledWith('user-1');
    expect(mockRunCareerCoachTurn).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('Senior Backend Engineer'),
        }),
      ]),
      expect.any(Function),
    );

    expect(mockCreateMessage).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        role: 'ASSISTANT',
        content: 'I noticed a 94% match for you: Senior Backend Engineer at Acme!',
      },
    });

    expect(mockUpdateHandoff).toHaveBeenCalledWith({
      where: { id: 'handoff-1' },
      data: { consumedAt: expect.any(Date) },
    });
  });

  it('seeds the Career Coach turn with recent conversation history before the opener prompt', async () => {
    mockFindManyMessages.mockResolvedValue([
      { role: 'USER', content: 'What skills should I learn?', createdAt: new Date() },
    ]);

    await processAgentHandoff(makeJob({ jobId: 'job-1', userId: 'user-1', matchScore: 94 }));

    const [history] = mockRunCareerCoachTurn.mock.calls[0]!;
    expect(history[0]).toEqual({ role: 'user', content: 'What skills should I learn?' });
    expect(history[1].role).toBe('user');
    expect(history[1].content).toContain('94');
  });
});
