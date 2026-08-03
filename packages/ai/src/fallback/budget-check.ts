const BUDGET_CACHE_TTL_MS = 60_000; // short TTL so a burst of calls doesn't hammer this endpoint per LLM call
const DEFAULT_MIN_BALANCE_USD = 1;

interface KeyInfoResponse {
  data?: { limit_remaining?: number | null };
}

interface CachedBudget {
  value: boolean;
  expiresAt: number;
}

let cache: CachedBudget | undefined;

// Uses OpenRouter's own account ledger (GET /key) instead of tracking spend
// ourselves — cached for BUDGET_CACHE_TTL_MS since this
// is checked before every fallback-eligible call.
export async function hasFallbackBudget(): Promise<boolean> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;

  const minBalance = Number(
    process.env.OPENROUTER_FALLBACK_MIN_BALANCE_USD ?? DEFAULT_MIN_BALANCE_USD,
  );
  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://openrouter.ai/api/v1';

  let value: boolean;
  try {
    const res = await fetch(`${baseUrl}/key`, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    });
    if (!res.ok) {
      value = false; // can't confirm budget — be conservative and skip the fallback
    } else {
      const body = (await res.json()) as KeyInfoResponse;
      const remaining = body.data?.limit_remaining;
      // null = no spend limit configured on this key, i.e. unlimited.
      value = remaining == null || remaining >= minBalance;
    }
  } catch {
    value = false;
  }

  cache = { value, expiresAt: Date.now() + BUDGET_CACHE_TTL_MS };
  return value;
}

// Test-only: clears the module-level cache between cases.
export function resetFallbackBudgetCache(): void {
  cache = undefined;
}
