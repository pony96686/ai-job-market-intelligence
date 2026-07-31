import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCareerProfileUpsert, mockUserProfileFindUnique, mockUserProfileUpdate } = vi.hoisted(() => ({
  mockCareerProfileUpsert: vi.fn(),
  mockUserProfileFindUnique: vi.fn(),
  mockUserProfileUpdate: vi.fn(),
}));
const { mockParseResumeFields, mockFetchGithubProfile, mockGenerateEmbedding, mockBuildProfileText } = vi.hoisted(() => ({
  mockParseResumeFields: vi.fn(),
  mockFetchGithubProfile: vi.fn(),
  mockGenerateEmbedding: vi.fn(),
  mockBuildProfileText: vi.fn(() => 'profile-text'),
}));
const { mockUpsertProfileEmbedding, mockEnqueueRescoring } = vi.hoisted(() => ({
  mockUpsertProfileEmbedding: vi.fn(),
  mockEnqueueRescoring: vi.fn(),
}));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    careerProfile: { upsert: mockCareerProfileUpsert },
    userProfile: { findUnique: mockUserProfileFindUnique, update: mockUserProfileUpdate },
  },
  upsertProfileEmbedding: mockUpsertProfileEmbedding,
}));

vi.mock('@ai-job-market-intelligence/ai', () => ({
  buildProfileText: mockBuildProfileText,
  generateEmbedding: mockGenerateEmbedding,
  parseResumeFields: mockParseResumeFields,
  fetchGithubProfile: mockFetchGithubProfile,
}));

vi.mock('../../lib/rescoring.js', () => ({ enqueueRescoring: mockEnqueueRescoring }));

vi.mock('../../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { processProfileParse } from '../profile-parse';

function makeJob(data: Record<string, unknown>) {
  return { id: 'profile-parse:user-1:resume', data } as never;
}

beforeEach(() => {
  mockCareerProfileUpsert.mockReset();
  mockUserProfileFindUnique.mockReset();
  mockUserProfileUpdate.mockReset();
  mockParseResumeFields.mockReset();
  mockFetchGithubProfile.mockReset();
  mockGenerateEmbedding.mockReset();
  mockUpsertProfileEmbedding.mockReset();
  mockEnqueueRescoring.mockReset();

  mockUserProfileFindUnique.mockResolvedValue(null);
  mockGenerateEmbedding.mockResolvedValue([0.1, 0.2]);
});

describe('processProfileParse — resume', () => {
  it('marks resumeParseStatus FAILED (not a thrown error) when parsing yields nothing', async () => {
    mockParseResumeFields.mockResolvedValue(null);

    await processProfileParse(makeJob({ userId: 'user-1', source: 'resume', resumeText: 'garbage' }));

    expect(mockCareerProfileUpsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', resumeParseStatus: 'FAILED' },
      update: { resumeParseStatus: 'FAILED' },
    });
    expect(mockEnqueueRescoring).not.toHaveBeenCalled();
  });

  it('writes resumeParseStatus SUCCESS + resumeParsedAt and merges skills on success', async () => {
    mockParseResumeFields.mockResolvedValue({ skills: ['node.js'], experienceYears: 5, summary: 'Backend engineer' });
    mockUserProfileFindUnique.mockResolvedValue({ skills: ['typescript'] });

    await processProfileParse(makeJob({ userId: 'user-1', source: 'resume', resumeText: 'real resume text' }));

    expect(mockCareerProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ resumeParseStatus: 'SUCCESS', resumeParsedAt: expect.any(Date) }),
      }),
    );
    expect(mockUserProfileUpdate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { skills: ['typescript', 'node.js'] },
    });
    expect(mockEnqueueRescoring).toHaveBeenCalledWith('user-1');
  });
});

describe('processProfileParse — github', () => {
  it('marks githubParseStatus FAILED but still records the requested username when the lookup fails', async () => {
    mockFetchGithubProfile.mockResolvedValue(null);

    await processProfileParse(makeJob({ userId: 'user-1', source: 'github', githubUsername: 'octocat' }));

    expect(mockCareerProfileUpsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', githubUsername: 'octocat', githubParseStatus: 'FAILED' },
      update: { githubUsername: 'octocat', githubParseStatus: 'FAILED' },
    });
    expect(mockEnqueueRescoring).not.toHaveBeenCalled();
  });

  it('writes githubParseStatus SUCCESS + githubParsedAt on success', async () => {
    mockFetchGithubProfile.mockResolvedValue({ languages: { TypeScript: 0.8 }, summary: 'Builds CLI tools' });

    await processProfileParse(makeJob({ userId: 'user-1', source: 'github', githubUsername: 'octocat' }));

    expect(mockCareerProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ githubParseStatus: 'SUCCESS', githubParsedAt: expect.any(Date) }),
      }),
    );
    expect(mockEnqueueRescoring).toHaveBeenCalledWith('user-1');
  });
});
