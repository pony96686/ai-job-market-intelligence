import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockFindUniqueOrThrow, mockUpdate } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindUniqueOrThrow: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: { user: { findUniqueOrThrow: mockFindUniqueOrThrow, update: mockUpdate } },
}));

import { GET, PUT } from '../route';

function makePutRequest(body: unknown) {
  return new Request('http://localhost/api/v1/users/me/notifications', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockAuth.mockReset();
  mockFindUniqueOrThrow.mockReset();
  mockUpdate.mockReset();
});

describe('GET /api/v1/users/me/notifications', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns the current setting', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockFindUniqueOrThrow.mockResolvedValue({ id: 'user-1', dailyBriefEnabled: true });

    const res = await GET();
    const body = await res.json();

    expect(body.data).toEqual({ dailyBriefEnabled: true });
  });
});

describe('PUT /api/v1/users/me/notifications', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PUT(makePutRequest({ dailyBriefEnabled: false }));

    expect(res.status).toBe(401);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 on an invalid body', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });

    const res = await PUT(makePutRequest({ dailyBriefEnabled: 'yes' }));

    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates dailyBriefEnabled for the requesting user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockUpdate.mockResolvedValue({ id: 'user-1', dailyBriefEnabled: false });

    const res = await PUT(makePutRequest({ dailyBriefEnabled: false }));
    const body = await res.json();

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { dailyBriefEnabled: false },
    });
    expect(body.data).toEqual({ dailyBriefEnabled: false });
  });
});
