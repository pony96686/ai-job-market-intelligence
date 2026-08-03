import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAuth, mockFindMany, mockCreate, mockDeleteMany } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
  mockDeleteMany: vi.fn(),
}));

const { mockRunCareerCoachTurn } = vi.hoisted(() => ({ mockRunCareerCoachTurn: vi.fn() }));

const { mockCreateToolExecutor } = vi.hoisted(() => ({
  mockCreateToolExecutor: vi.fn(() => vi.fn()),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

vi.mock('@ai-job-market-intelligence/db', () => ({
  prisma: {
    careerCoachMessage: { findMany: mockFindMany, create: mockCreate, deleteMany: mockDeleteMany },
  },
  createCareerCoachToolExecutor: mockCreateToolExecutor,
}));

vi.mock('@ai-job-market-intelligence/ai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ai-job-market-intelligence/ai')>()),
  runCareerCoachTurn: mockRunCareerCoachTurn,
}));

import { GET, POST, DELETE } from '../route';
import { CareerCoachRateLimitError } from '@ai-job-market-intelligence/ai';

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/v1/career-coach/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function readSSE(response: Response): Promise<string> {
  return response.text();
}

beforeEach(() => {
  mockAuth.mockReset();
  mockFindMany.mockReset();
  mockCreate.mockReset();
  mockDeleteMany.mockReset();
  mockRunCareerCoachTurn.mockReset();
  mockCreateToolExecutor.mockReset().mockReturnValue(vi.fn());

  mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
  mockCreate.mockResolvedValue({});
  mockFindMany.mockResolvedValue([]);
  mockDeleteMany.mockResolvedValue({ count: 0 });
  mockRunCareerCoachTurn.mockResolvedValue('Hi there');
});

describe('GET /api/v1/career-coach/messages', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns the conversation history oldest-first', async () => {
    mockFindMany.mockResolvedValue([
      { role: 'USER', content: 'Hi', createdAt: new Date('2026-08-02T00:00:00Z') },
      { role: 'ASSISTANT', content: 'Hello!', createdAt: new Date('2026-08-02T00:00:01Z') },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' }, orderBy: { createdAt: 'asc' } }),
    );
    expect(body.data).toEqual([
      { role: 'USER', content: 'Hi', createdAt: '2026-08-02T00:00:00.000Z' },
      { role: 'ASSISTANT', content: 'Hello!', createdAt: '2026-08-02T00:00:01.000Z' },
    ]);
  });
});

describe('POST /api/v1/career-coach/messages', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(makePostRequest({ content: 'hi' }));

    expect(res.status).toBe(401);
  });

  it('returns 400 on an empty message', async () => {
    const res = await POST(makePostRequest({ content: '' }));

    expect(res.status).toBe(400);
    expect(mockRunCareerCoachTurn).not.toHaveBeenCalled();
  });

  it('persists the user message before invoking the agent', async () => {
    await POST(makePostRequest({ content: 'What should I learn next?' }));

    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', role: 'USER', content: 'What should I learn next?' },
    });
  });

  it('scopes the tool executor to the requesting user', async () => {
    await POST(makePostRequest({ content: 'hi' }));

    expect(mockCreateToolExecutor).toHaveBeenCalledWith('user-1');
  });

  it('persists the assistant reply', async () => {
    mockRunCareerCoachTurn.mockResolvedValue('You should learn Rust.');

    await POST(makePostRequest({ content: 'hi' }));

    expect(mockCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', role: 'ASSISTANT', content: 'You should learn Rust.' },
    });
  });

  it('streams the reply over SSE and terminates with [DONE]', async () => {
    mockRunCareerCoachTurn.mockResolvedValue('Hello world');

    const res = await POST(makePostRequest({ content: 'hi' }));

    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    const text = await readSSE(res);
    expect(text).toContain('"delta":"Hello"');
    expect(text).toContain('"delta":" world"');
    expect(text.trim().endsWith('data: [DONE]')).toBe(true);
  });

  it('returns 502 when the agent throws a generic error', async () => {
    mockRunCareerCoachTurn.mockRejectedValue(new Error('LLM exploded'));

    const res = await POST(makePostRequest({ content: 'hi' }));

    expect(res.status).toBe(502);
  });

  it('returns 429 with RATE_LIMITED when the agent hits the LLM rate limit', async () => {
    mockRunCareerCoachTurn.mockRejectedValue(new CareerCoachRateLimitError());

    const res = await POST(makePostRequest({ content: 'hi' }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
  });
});

// Clear history is a hard delete of
// career_coach_messages only, no conversationId/multi-thread concept.
describe('DELETE /api/v1/career-coach/messages', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await DELETE();

    expect(res.status).toBe(401);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it("deletes all of the requesting user's messages and nothing else", async () => {
    const res = await DELETE();
    const body = await res.json();

    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(body.data).toEqual({ cleared: true });
  });
});
