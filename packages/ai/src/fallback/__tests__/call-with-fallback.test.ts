import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockHasFallbackBudget } = vi.hoisted(() => ({ mockHasFallbackBudget: vi.fn() }));

vi.mock('../budget-check', () => ({ hasFallbackBudget: mockHasFallbackBudget }));

import { callWithFallback } from '../call-with-fallback';

function rateLimitError() {
  return Object.assign(new Error('rate limited'), { status: 429 });
}

beforeEach(() => {
  mockHasFallbackBudget.mockReset();
  mockHasFallbackBudget.mockResolvedValue(true);
});

describe('callWithFallback', () => {
  it('returns the result on the first successful attempt without touching the fallback', async () => {
    const attempt = vi.fn().mockResolvedValue('ok');

    const result = await callWithFallback(attempt, { primary: 'free-model' });

    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith('free-model');
    expect(mockHasFallbackBudget).not.toHaveBeenCalled();
  });

  it('retries the primary model once on a non-rate-limit error before giving up', async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce('ok');

    const result = await callWithFallback(attempt, { primary: 'free-model' });

    expect(result).toBe('ok');
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it('returns null when no fallback is configured and the primary exhausts its retries', async () => {
    const attempt = vi.fn().mockRejectedValue(new Error('down'));

    const result = await callWithFallback(attempt, { primary: 'free-model' });

    expect(result).toBeNull();
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(mockHasFallbackBudget).not.toHaveBeenCalled();
  });

  it('skips straight to the fallback check on a 429 without a second primary attempt', async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValueOnce('from-fallback');

    const result = await callWithFallback(attempt, {
      primary: 'free-model',
      fallback: 'paid-model',
    });

    expect(result).toBe('from-fallback');
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(attempt).toHaveBeenNthCalledWith(1, 'free-model');
    expect(attempt).toHaveBeenNthCalledWith(2, 'paid-model');
  });

  it('calls the fallback model once the primary is exhausted, when configured and budget allows', async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce('from-fallback');

    const result = await callWithFallback(attempt, {
      primary: 'free-model',
      fallback: 'paid-model',
    });

    expect(result).toBe('from-fallback');
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(attempt).toHaveBeenNthCalledWith(3, 'paid-model');
  });

  it('does not call the fallback model when the account is below the budget threshold', async () => {
    mockHasFallbackBudget.mockResolvedValue(false);
    const attempt = vi.fn().mockRejectedValue(new Error('down'));

    const result = await callWithFallback(attempt, {
      primary: 'free-model',
      fallback: 'paid-model',
    });

    expect(result).toBeNull();
    expect(attempt).toHaveBeenCalledTimes(2); // only the primary's attempts, never the fallback
  });

  it('returns null when the fallback model is also unavailable', async () => {
    const attempt = vi.fn().mockRejectedValue(new Error('down'));

    const result = await callWithFallback(attempt, {
      primary: 'free-model',
      fallback: 'paid-model',
    });

    expect(result).toBeNull();
    expect(attempt).toHaveBeenCalledTimes(3); // 2 primary + 1 fallback
  });

  it('invokes onAttemptFailed for every failed attempt including the fallback', async () => {
    const attempt = vi.fn().mockRejectedValue(new Error('down'));
    const onAttemptFailed = vi.fn();

    await callWithFallback(
      attempt,
      { primary: 'free-model', fallback: 'paid-model' },
      onAttemptFailed,
    );

    expect(onAttemptFailed).toHaveBeenCalledTimes(3);
    expect(onAttemptFailed).toHaveBeenNthCalledWith(1, 'free-model', 1, expect.any(Error));
    expect(onAttemptFailed).toHaveBeenNthCalledWith(2, 'free-model', 2, expect.any(Error));
    expect(onAttemptFailed).toHaveBeenNthCalledWith(3, 'paid-model', 3, expect.any(Error));
  });
});
