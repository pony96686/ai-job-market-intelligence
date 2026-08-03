import type {
  CareerBriefResponse,
  CareerCoachMessageDto,
  ErrorCode,
} from '@ai-job-market-intelligence/shared';

// Carries the API's error code (e.g. RATE_LIMITED) so the UI can show a
// specific, translated message instead of a generic "failed to send".
export class CareerCoachSendError extends Error {
  code?: ErrorCode;
  constructor(code?: ErrorCode) {
    super('Failed to send message');
    this.code = code;
  }
}

// null (not an error) when the user has no brief yet — Daily Brief
// generation is a nightly cron, so a brand-new user legitimately has none
// until the next run.
export async function fetchLatestCareerBrief(): Promise<CareerBriefResponse | null> {
  const res = await fetch('/api/v1/career-agent/briefs/latest');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load career brief');
  const body = await res.json();
  return body.data;
}

export async function fetchCareerCoachHistory(): Promise<CareerCoachMessageDto[]> {
  const res = await fetch('/api/v1/career-coach/messages');
  if (!res.ok) throw new Error('Failed to load conversation history');
  const body = await res.json();
  return body.data;
}

// Hard delete, irreversible — no conversationId/multi-thread concept,
// so this clears the user's entire history.
export async function clearCareerCoachHistory(): Promise<void> {
  const res = await fetch('/api/v1/career-coach/messages', { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear conversation history');
}

// Consumes the SSE stream from POST /api/v1/career-coach/messages, calling
// onDelta as each word arrives so the caller can render progressively
// (route.ts streams an already-fully-resolved answer word-by-word, see its
// comment for why this isn't true token-level LLM streaming).
export async function sendCareerCoachMessage(
  content: string,
  onDelta: (delta: string) => void,
): Promise<void> {
  const res = await fetch('/api/v1/career-coach/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new CareerCoachSendError(body?.error?.code);
  }
  if (!res.body) {
    throw new CareerCoachSendError();
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const payload = line.replace(/^data: /, '').trim();
      if (!payload || payload === '[DONE]') continue;
      const { delta } = JSON.parse(payload) as { delta: string };
      onDelta(delta);
    }
  }
}
