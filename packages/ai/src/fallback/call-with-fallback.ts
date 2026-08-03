import { hasFallbackBudget } from './budget-check';

export interface FallbackModels {
  primary: string;
  // Undefined = fallback not configured for this call site — behaves
  // identically to not having this module at all (unconfigured behavior
  // must stay unchanged).
  fallback?: string;
}

const PRIMARY_MAX_ATTEMPTS = 2; // initial attempt + 1 retry, matches each call site's pre-existing retry count

function isRateLimitStatus(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { status?: number }).status === 429
  );
}

// Unified retry + paid-fallback-model policy for every Chat/LLM call site
// (Job Parsing, Scoring, Resume/GitHub parsing, Career Coach) — not
// Embedding. Retries the primary (free)
// model, except a 429 skips straight to the fallback check since retrying
// within the same call can't un-exhaust a daily quota. Only attempts the
// fallback model when one is configured AND the account still has budget.
// Returns null when nothing worked — every existing
// caller already has an all-attempts-failed path (rule-score-only,
// confidence=0, etc.) that this just routes into unchanged.
export async function callWithFallback<T>(
  attempt: (model: string) => Promise<T>,
  models: FallbackModels,
  onAttemptFailed?: (model: string, attemptNumber: number, error: unknown) => void,
): Promise<T | null> {
  for (let i = 1; i <= PRIMARY_MAX_ATTEMPTS; i++) {
    try {
      return await attempt(models.primary);
    } catch (error) {
      onAttemptFailed?.(models.primary, i, error);
      if (isRateLimitStatus(error) || i === PRIMARY_MAX_ATTEMPTS) break;
    }
  }

  if (models.fallback && (await hasFallbackBudget())) {
    try {
      return await attempt(models.fallback);
    } catch (error) {
      onAttemptFailed?.(models.fallback, PRIMARY_MAX_ATTEMPTS + 1, error);
    }
  }

  return null;
}
