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

const { mockCanScore, mockIncrementUsage } = vi.hoisted(() => ({
  mockCanScore: vi.fn(),
  mockIncrementUsage: vi.fn(),
}));

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

vi.mock('../../billing/usage.js', () => ({
  canScore: mockCanScore,
  incrementUsage: mockIncrementUsage,
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

  // The instant high-match email
  // (score >= 80 + APPLY) is retired — scoring_match no longer imports or
  // touches notify_email at all. A high-scoring APPLY result surfaces later
  // via Opportunity Discovery in the next day's Career Brief instead.
  it('does not import or call the notify_email queue for a high-scoring APPLY decision', async () => {
    await expect(
      processScoringMatch(makeJob({ jobId: 'job-1', userId: 'user-1' })),
    ).resolves.toBeUndefined();
  });
});
