import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
const { mockFindJob } = vi.hoisted(() => ({ mockFindJob: vi.fn() }));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: { job: { findUnique: mockFindJob } },
}));

import { GET } from '../route';

function makeParams(id = 'job-1') {
  return { params: Promise.resolve({ id }) };
}

function baseJob(overrides: { applications?: unknown[] } = {}) {
  return {
    id: 'job-1',
    title: 'Backend Engineer',
    company: 'Acme',
    description: 'Build things.',
    url: 'https://example.com/job-1',
    location: 'Remote',
    tags: ['node'],
    source: 'REMOTEOK',
    role: 'Backend Engineer',
    level: 'Senior',
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    remote: true,
    eligibleRegions: [],
    parseConfidence: 0.9,
    status: 'ACTIVE',
    postedAt: new Date('2026-08-01T00:00:00Z'),
    createdAt: new Date('2026-08-01T00:00:00Z'),
    applications: overrides.applications ?? [],
  };
}

beforeEach(() => {
  mockAuth.mockReset();
  mockFindJob.mockReset();
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
});

describe('GET /api/v1/jobs/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(401);
  });

  it('returns 404 when the job does not exist', async () => {
    mockFindJob.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(404);
  });

  it('scopes the applications include to the current user', async () => {
    mockFindJob.mockResolvedValue(baseJob());

    await GET(new Request('http://localhost'), makeParams());

    expect(mockFindJob).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      include: { applications: { where: { userId: 'user-1' } } },
    });
  });

  it('returns application: null when unmarked', async () => {
    mockFindJob.mockResolvedValue(baseJob());

    const res = await GET(new Request('http://localhost'), makeParams());
    const body = await res.json();

    expect(body.data.application).toBeNull();
  });

  it('includes the application status/updatedAt when one exists', async () => {
    mockFindJob.mockResolvedValue(
      baseJob({ applications: [{ status: 'OFFER', updatedAt: new Date('2026-08-04T10:00:00Z') }] }),
    );

    const res = await GET(new Request('http://localhost'), makeParams());
    const body = await res.json();

    expect(body.data.application).toEqual({
      status: 'OFFER',
      updatedAt: '2026-08-04T10:00:00.000Z',
    });
  });
});
