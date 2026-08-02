import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hasFallbackBudget, resetFallbackBudgetCache } from '../budget-check';

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

function mockKeyResponse(limitRemaining: number | null, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => ({ data: { limit_remaining: limitRemaining } }),
  });
}

beforeEach(() => {
  resetFallbackBudgetCache();
  process.env.OPENROUTER_API_KEY = 'test-key';
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENROUTER_FALLBACK_MIN_BALANCE_USD;
});

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
});

describe('hasFallbackBudget', () => {
  it('returns true when remaining balance is at or above the default $1 threshold', async () => {
    global.fetch = mockKeyResponse(5) as unknown as typeof fetch;

    expect(await hasFallbackBudget()).toBe(true);
  });

  it('returns false when remaining balance is below the threshold', async () => {
    global.fetch = mockKeyResponse(0.5) as unknown as typeof fetch;

    expect(await hasFallbackBudget()).toBe(false);
  });

  it('respects a custom OPENROUTER_FALLBACK_MIN_BALANCE_USD threshold', async () => {
    process.env.OPENROUTER_FALLBACK_MIN_BALANCE_USD = '10';
    global.fetch = mockKeyResponse(5) as unknown as typeof fetch;

    expect(await hasFallbackBudget()).toBe(false);
  });

  it('treats a null limit_remaining (no spend cap configured) as unlimited budget', async () => {
    global.fetch = mockKeyResponse(null) as unknown as typeof fetch;

    expect(await hasFallbackBudget()).toBe(true);
  });

  it('conservatively returns false when the key-info request fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    expect(await hasFallbackBudget()).toBe(false);
  });

  it('conservatively returns false on a non-ok response', async () => {
    global.fetch = mockKeyResponse(100, false) as unknown as typeof fetch;

    expect(await hasFallbackBudget()).toBe(false);
  });

  it('caches the result so a second call within the TTL does not refetch', async () => {
    const fetchMock = mockKeyResponse(5);
    global.fetch = fetchMock as unknown as typeof fetch;

    await hasFallbackBudget();
    await hasFallbackBudget();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
