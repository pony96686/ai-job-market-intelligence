import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockFindProfile,
  mockFindJob,
  mockGetJobEmbedding,
  mockGetProfileEmbedding,
  mockUpsertProfileEmbedding,
  mockFindScore,
  mockUpsertScore,
} = vi.hoisted(() => ({
  mockFindProfile: vi.fn(),
  mockFindJob: vi.fn(),
  mockGetJobEmbedding: vi.fn(),
  mockGetProfileEmbedding: vi.fn(),
  mockUpsertProfileEmbedding: vi.fn(),
  mockFindScore: vi.fn(),
  mockUpsertScore: vi.fn(),
}));

const { mockBuildProfileText, mockGenerateEmbedding, mockScoreJob } = vi.hoisted(() => ({
  mockBuildProfileText: vi.fn(() => 'profile-text'),
  mockGenerateEmbedding: vi.fn(),
  mockScoreJob: vi.fn(),
}));

const { mockCanScore, mockIncrementUsage, mockCanNotify } = vi.hoisted(() => ({
  mockCanScore: vi.fn(),
  mockIncrementUsage: vi.fn(),
  mockCanNotify: vi.fn(),
}));

const { mockQueueAdd } = vi.hoisted(() => ({ mockQueueAdd: vi.fn() }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    userProfile: { findUniqueOrThrow: mockFindProfile },
    job: { findUniqueOrThrow: mockFindJob },
    jobScore: { findUnique: mockFindScore, upsert: mockUpsertScore },
  },
  getJobEmbedding: mockGetJobEmbedding,
  getProfileEmbedding: mockGetProfileEmbedding,
  upsertProfileEmbedding: mockUpsertProfileEmbedding,
}));

vi.mock('@ai-job-market-intelligence/ai', () => ({
  buildProfileText: mockBuildProfileText,
  generateEmbedding: mockGenerateEmbedding,
  scoreJob: mockScoreJob,
}));

vi.mock('@ai-job-market-intelligence/shared/queue', () => ({
  getNotifyEmailQueue: () => ({ add: mockQueueAdd }),
  NOTIFY_EMAIL_JOB_OPTS: {},
}));

vi.mock('@ai-job-market-intelligence/shared/constants', () => ({
  HIGH_MATCH_SCORE_THRESHOLD: 80,
}));

vi.mock('../../billing/usage.js', () => ({
  canScore: mockCanScore,
  incrementUsage: mockIncrementUsage,
  canNotify: mockCanNotify,
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { processScoringMatch } from '../scoring-match';

const scoringResult = {
  score: 85,
  decision: 'APPLY' as const,
  reasoning: 'Great match',
  strengths: ['Node.js experience'],
  skillGap: [],
  llmScore: 85,
  embeddingScore: 80,
  ruleScore: 80,
  scoringVersion: 'v3' as const,
};

function makeJob(data: { jobId: string; userId: string }) {
  return { id: `score:${data.jobId}:${data.userId}`, data } as never;
}

beforeEach(() => {
  mockFindProfile.mockReset();
  mockFindJob.mockReset();
  mockGetJobEmbedding.mockReset();
  mockGetProfileEmbedding.mockReset();
  mockUpsertProfileEmbedding.mockReset();
  mockFindScore.mockReset();
  mockUpsertScore.mockReset();
  mockGenerateEmbedding.mockReset();
  mockScoreJob.mockReset();
  mockCanScore.mockReset();
  mockIncrementUsage.mockReset();
  mockCanNotify.mockReset();
  mockQueueAdd.mockReset();

  mockCanScore.mockResolvedValue(true);
  mockFindProfile.mockResolvedValue({
    userId: 'user-1',
    skills: ['node'],
    experienceYears: 5,
    preferredRoles: [],
  });
  mockFindJob.mockResolvedValue({ id: 'job-1', title: 'Backend Engineer' });
  mockGetJobEmbedding.mockResolvedValue([0.1, 0.2]);
  mockGetProfileEmbedding.mockResolvedValue([0.1, 0.2]);
  mockScoreJob.mockResolvedValue(scoringResult);
  mockFindScore.mockResolvedValue(null);
  mockUpsertScore.mockResolvedValue({});
  mockCanNotify.mockResolvedValue(true);
});

describe('processScoringMatch', () => {
  it('skips scoring entirely once the daily quota is exceeded', async () => {
    mockCanScore.mockResolvedValue(false);

    await processScoringMatch(makeJob({ jobId: 'job-1', userId: 'user-1' }));

    expect(mockFindProfile).not.toHaveBeenCalled();
    expect(mockUpsertScore).not.toHaveBeenCalled();
  });

  it('throws when the job has no embedding yet', async () => {
    mockGetJobEmbedding.mockResolvedValue(null);

    await expect(
      processScoringMatch(makeJob({ jobId: 'job-1', userId: 'user-1' })),
    ).rejects.toThrow('has no embedding yet');
  });

  it('generates and persists a profile embedding when missing', async () => {
    mockGetProfileEmbedding.mockResolvedValue(null);
    mockGenerateEmbedding.mockResolvedValue([0.3, 0.4]);

    await processScoringMatch(makeJob({ jobId: 'job-1', userId: 'user-1' }));

    expect(mockGenerateEmbedding).toHaveBeenCalledWith('profile-text');
    expect(mockUpsertProfileEmbedding).toHaveBeenCalledWith('user-1', [0.3, 0.4]);
  });

  it('upserts the score idempotently and increments usage only on first score', async () => {
    await processScoringMatch(makeJob({ jobId: 'job-1', userId: 'user-1' }));

    expect(mockUpsertScore).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { jobId_userId: { jobId: 'job-1', userId: 'user-1' } },
        create: expect.objectContaining(scoringResult),
      }),
    );
    expect(mockIncrementUsage).toHaveBeenCalledWith('user-1');
  });

  it('does not increment usage when a score already exists for this job+user', async () => {
    mockFindScore.mockResolvedValue({ id: 'existing-score' });

    await processScoringMatch(makeJob({ jobId: 'job-1', userId: 'user-1' }));

    expect(mockIncrementUsage).not.toHaveBeenCalled();
  });

  it('enqueues a notification for a high-scoring APPLY decision on a Pro user', async () => {
    await processScoringMatch(makeJob({ jobId: 'job-1', userId: 'user-1' }));

    expect(mockQueueAdd).toHaveBeenCalledWith(
      'notify',
      { jobId: 'job-1', userId: 'user-1' },
      expect.objectContaining({ jobId: 'notify:job-1:user-1' }),
    );
  });

  it('does not notify a Free user even with a high APPLY score', async () => {
    mockCanNotify.mockResolvedValue(false);

    await processScoringMatch(makeJob({ jobId: 'job-1', userId: 'user-1' }));

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('does not notify when the score is below the high-match threshold', async () => {
    mockScoreJob.mockResolvedValue({ ...scoringResult, score: 79 });

    await processScoringMatch(makeJob({ jobId: 'job-1', userId: 'user-1' }));

    expect(mockQueueAdd).not.toHaveBeenCalled();
  });
});
