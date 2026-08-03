import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
const { mockFindManyHandoffs, mockFindManyJobs } = vi.hoisted(() => ({
  mockFindManyHandoffs: vi.fn(),
  mockFindManyJobs: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    agentHandoff: { findMany: mockFindManyHandoffs },
    job: { findMany: mockFindManyJobs },
  },
}));

import { GET } from '../route';

function makeRequest(query = '') {
  return new Request(`http://localhost/api/v1/agent-handoffs${query}`);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockFindManyHandoffs.mockReset();
  mockFindManyJobs.mockReset();

  mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
  mockFindManyJobs.mockResolvedValue([{ id: 'job-1', title: 'Backend Engineer', company: 'Acme' }]);
});

describe('GET /api/v1/agent-handoffs', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    expect(mockFindManyHandoffs).not.toHaveBeenCalled();
  });

  it('defaults the limit to 10', async () => {
    mockFindManyHandoffs.mockResolvedValue([]);

    await GET(makeRequest());

    expect(mockFindManyHandoffs).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, take: 10 }),
    );
  });

  it('returns 400 on an invalid limit', async () => {
    const res = await GET(makeRequest('?limit=0'));
    expect(res.status).toBe(400);
  });

  it('enriches a handoff with the referenced job title/company', async () => {
    mockFindManyHandoffs.mockResolvedValue([
      {
        id: 'handoff-1',
        fromAgent: 'OPPORTUNITY_DISCOVERY',
        toAgent: 'CAREER_COACH',
        context: { jobId: 'job-1', matchScore: 94, reason: 'score >= 90 threshold (94)' },
        triggeredAt: new Date('2026-08-03T00:00:00Z'),
        consumedAt: new Date('2026-08-03T00:00:05Z'),
      },
    ]);

    const res = await GET(makeRequest('?limit=5'));
    const body = await res.json();

    expect(body.data).toEqual([
      {
        id: 'handoff-1',
        fromAgent: 'OPPORTUNITY_DISCOVERY',
        toAgent: 'CAREER_COACH',
        jobId: 'job-1',
        jobTitle: 'Backend Engineer',
        company: 'Acme',
        matchScore: 94,
        reason: 'score >= 90 threshold (94)',
        triggeredAt: '2026-08-03T00:00:00.000Z',
        consumedAt: '2026-08-03T00:00:05.000Z',
      },
    ]);
  });

  it('drops a handoff whose job was since deleted rather than returning a broken entry', async () => {
    mockFindManyJobs.mockResolvedValue([]); // the referenced job no longer exists
    mockFindManyHandoffs.mockResolvedValue([
      {
        id: 'handoff-1',
        fromAgent: 'OPPORTUNITY_DISCOVERY',
        toAgent: 'CAREER_COACH',
        context: { jobId: 'job-1', matchScore: 94, reason: 'score >= 90 threshold (94)' },
        triggeredAt: new Date(),
        consumedAt: null,
      },
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.data).toEqual([]);
  });

  it('drops a handoff with a malformed context payload', async () => {
    mockFindManyHandoffs.mockResolvedValue([
      {
        id: 'handoff-1',
        fromAgent: 'OPPORTUNITY_DISCOVERY',
        toAgent: 'CAREER_COACH',
        context: { unexpected: true },
        triggeredAt: new Date(),
        consumedAt: null,
      },
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.data).toEqual([]);
    expect(mockFindManyJobs).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [] } } }),
    );
  });
});
