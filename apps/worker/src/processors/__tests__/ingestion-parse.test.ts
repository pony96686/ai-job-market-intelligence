import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockFindUnique,
  mockUpsert,
  mockUpdate,
  mockFindManyUsers,
  mockUpsertJobEmbedding,
  mockFindSimilarJobs,
  mockRecordAlsoSeenOn,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockFindManyUsers: vi.fn(),
  mockUpsertJobEmbedding: vi.fn(),
  mockFindSimilarJobs: vi.fn(),
  mockRecordAlsoSeenOn: vi.fn(),
}));

const { mockParseJobFields, mockGenerateEmbedding, mockBuildJobText, mockBuildStructuredJobFields } = vi.hoisted(() => ({
  mockParseJobFields: vi.fn(),
  mockGenerateEmbedding: vi.fn(),
  mockBuildJobText: vi.fn(() => 'embedding-text'),
  mockBuildStructuredJobFields: vi.fn(),
}));

const { mockComputeContentHash } = vi.hoisted(() => ({ mockComputeContentHash: vi.fn() }));
const { mockQueueAdd } = vi.hoisted(() => ({ mockQueueAdd: vi.fn() }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    job: { findUnique: mockFindUnique, upsert: mockUpsert, update: mockUpdate },
    user: { findMany: mockFindManyUsers },
  },
  upsertJobEmbedding: mockUpsertJobEmbedding,
  findSimilarJobs: mockFindSimilarJobs,
  recordAlsoSeenOn: mockRecordAlsoSeenOn,
}));

vi.mock('@ai-job-market-intelligence/ai', () => ({
  parseJobFields: mockParseJobFields,
  generateEmbedding: mockGenerateEmbedding,
  buildJobText: mockBuildJobText,
  buildStructuredJobFields: mockBuildStructuredJobFields,
}));

vi.mock('@ai-job-market-intelligence/shared/ingestion', () => ({
  computeContentHash: mockComputeContentHash,
}));

vi.mock('@ai-job-market-intelligence/shared/queue', () => ({
  getScoringMatchQueue: () => ({ add: mockQueueAdd }),
  SCORING_MATCH_JOB_OPTS: {},
}));

vi.mock('../../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { processIngestionParse } from '../ingestion-parse';

const normalized = {
  externalId: 'ext-1',
  source: 'REMOTEOK',
  title: 'Backend Engineer',
  company: 'Acme',
  description: 'A'.repeat(100),
  url: 'https://example.com/1',
  location: 'Remote',
  tags: ['node'],
  postedAt: new Date(),
};

function makeJob(data: Record<string, unknown>) {
  return { id: 'parse:REMOTEOK:ext-1', data } as never;
}

const parsedFields = {
  role: 'Backend Engineer',
  level: 'Senior' as const,
  skills: ['node'],
  salaryMin: 100_000,
  salaryMax: 150_000,
  remote: true,
  confidence: 0.9,
};

beforeEach(() => {
  mockFindUnique.mockReset();
  mockUpsert.mockReset();
  mockUpdate.mockReset();
  mockFindManyUsers.mockReset();
  mockUpsertJobEmbedding.mockReset();
  mockFindSimilarJobs.mockReset();
  mockRecordAlsoSeenOn.mockReset();
  mockParseJobFields.mockReset();
  mockGenerateEmbedding.mockReset();
  mockBuildStructuredJobFields.mockReset();
  mockComputeContentHash.mockReset();
  mockQueueAdd.mockReset();

  mockFindUnique.mockResolvedValue(null);
  mockComputeContentHash.mockReturnValue('new-hash');
  mockParseJobFields.mockResolvedValue(parsedFields);
  mockGenerateEmbedding.mockResolvedValue([0.1, 0.2]);
  mockFindSimilarJobs.mockResolvedValue([]);
  mockUpsert.mockResolvedValue({ id: 'job-1' });
  mockFindManyUsers.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
});

describe('processIngestionParse', () => {
  it('skips re-parsing and just touches metadata when the content hash is unchanged', async () => {
    mockFindUnique.mockResolvedValue({ id: 'job-1', contentHash: 'new-hash' });

    await processIngestionParse(makeJob({ normalized, companyId: 'company-1' }));

    expect(mockParseJobFields).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { postedAt: normalized.postedAt, updatedAt: expect.any(Date) },
    });
  });

  it('re-parses when the content hash differs from the stored one', async () => {
    mockFindUnique.mockResolvedValue({ id: 'job-1', contentHash: 'old-hash' });

    await processIngestionParse(makeJob({ normalized, companyId: 'company-1' }));

    expect(mockParseJobFields).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('parses, embeds, and upserts a new job, then enqueues scoring for every onboarded user', async () => {
    await processIngestionParse(makeJob({ normalized, companyId: 'company-1' }));

    expect(mockParseJobFields).toHaveBeenCalledWith({
      title: normalized.title,
      description: normalized.description,
      tags: normalized.tags,
    });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          companyId: 'company-1',
          role: 'Backend Engineer',
          level: 'Senior',
          salaryMin: 100_000,
          salaryMax: 150_000,
          remote: true,
          parseConfidence: 0.9,
          contentHash: 'new-hash',
          sourceStructured: false,
        }),
      }),
    );
    expect(mockUpsertJobEmbedding).toHaveBeenCalledWith('job-1', [0.1, 0.2], 'text-embedding-3-small');
    expect(mockQueueAdd).toHaveBeenCalledTimes(2);
    expect(mockQueueAdd).toHaveBeenCalledWith(
      'score',
      { jobId: 'job-1', userId: 'user-1' },
      expect.objectContaining({ jobId: 'score:job-1:user-1' }),
    );
  });

  it('records alsoSeenOn and skips upsert/scoring when a cross-source duplicate is found', async () => {
    mockFindSimilarJobs.mockResolvedValue([{ id: 'canonical-job', source: 'GREENHOUSE' }]);

    await processIngestionParse(makeJob({ normalized, companyId: 'company-1' }));

    expect(mockRecordAlsoSeenOn).toHaveBeenCalledWith('canonical-job', 'REMOTEOK');
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockQueueAdd).not.toHaveBeenCalled();
  });

  it('skips AI Job Parsing for sourceStructured normalized jobs (Himalayas)', async () => {
    const structuredNormalized = { ...normalized, source: 'HIMALAYAS', sourceStructured: true };
    mockBuildStructuredJobFields.mockReturnValue({ ...parsedFields, confidence: 1.0 });

    await processIngestionParse(makeJob({ normalized: structuredNormalized, companyId: 'company-1' }));

    expect(mockParseJobFields).not.toHaveBeenCalled();
    expect(mockBuildStructuredJobFields).toHaveBeenCalledWith(structuredNormalized);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ parseConfidence: 1.0, sourceStructured: true }) }),
    );
  });
});
