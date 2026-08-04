import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));
const { mockFindJob, mockUpsertApplication, mockDeleteManyApplications } = vi.hoisted(() => ({
  mockFindJob: vi.fn(),
  mockUpsertApplication: vi.fn(),
  mockDeleteManyApplications: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    job: { findUnique: mockFindJob },
    jobApplication: { upsert: mockUpsertApplication, deleteMany: mockDeleteManyApplications },
  },
}));

import { PUT, DELETE } from '../route';

function makeParams(id = 'job-1') {
  return { params: Promise.resolve({ id }) };
}

function makePutRequest(body: unknown) {
  return new Request('http://localhost/api/v1/jobs/job-1/application', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockAuth.mockReset();
  mockFindJob.mockReset();
  mockUpsertApplication.mockReset();
  mockDeleteManyApplications.mockReset();

  mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
  mockFindJob.mockResolvedValue({ id: 'job-1' });
});

describe('PUT /api/v1/jobs/:id/application', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PUT(makePutRequest({ status: 'APPLIED' }), makeParams());

    expect(res.status).toBe(401);
    expect(mockUpsertApplication).not.toHaveBeenCalled();
  });

  it('returns 400 on an invalid status', async () => {
    const res = await PUT(makePutRequest({ status: 'NOT_A_STATUS' }), makeParams());
    expect(res.status).toBe(400);
    expect(mockUpsertApplication).not.toHaveBeenCalled();
  });

  it('returns 404 when the job does not exist', async () => {
    mockFindJob.mockResolvedValue(null);

    const res = await PUT(makePutRequest({ status: 'APPLIED' }), makeParams());

    expect(res.status).toBe(404);
    expect(mockUpsertApplication).not.toHaveBeenCalled();
  });

  it('upserts the application and returns it', async () => {
    mockUpsertApplication.mockResolvedValue({
      jobId: 'job-1',
      status: 'INTERVIEWING',
      note: 'HR phone screen 6/30',
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-04T00:00:00Z'),
    });

    const res = await PUT(
      makePutRequest({ status: 'INTERVIEWING', note: 'HR phone screen 6/30' }),
      makeParams(),
    );
    const body = await res.json();

    expect(mockUpsertApplication).toHaveBeenCalledWith({
      where: { jobId_userId: { jobId: 'job-1', userId: 'user-1' } },
      create: {
        jobId: 'job-1',
        userId: 'user-1',
        status: 'INTERVIEWING',
        note: 'HR phone screen 6/30',
      },
      update: { status: 'INTERVIEWING', note: 'HR phone screen 6/30' },
    });
    expect(body.data).toEqual({
      jobId: 'job-1',
      status: 'INTERVIEWING',
      note: 'HR phone screen 6/30',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-04T00:00:00.000Z',
    });
  });
});

describe('DELETE /api/v1/jobs/:id/application', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(401);
    expect(mockDeleteManyApplications).not.toHaveBeenCalled();
  });

  it('returns 204 and scopes the delete to the current user', async () => {
    mockDeleteManyApplications.mockResolvedValue({ count: 1 });

    const res = await DELETE(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(204);
    expect(mockDeleteManyApplications).toHaveBeenCalledWith({
      where: { jobId: 'job-1', userId: 'user-1' },
    });
  });

  it('is idempotent when no application record exists', async () => {
    mockDeleteManyApplications.mockResolvedValue({ count: 0 });

    const res = await DELETE(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(204);
  });
});
