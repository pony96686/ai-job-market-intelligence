import type OpenAI from 'openai';
import { getOpenRouterClient } from '../openrouter-client';
import { callWithFallback } from '../fallback';

// Same free-tier model as V1 scoring/parsing, but independently configurable
// (v2-scope.md §2 decision #4) — if the free model turns out to be
// unreliable at tool-calling under load, this can be upgraded without
// touching scoring/parsing.
const DEFAULT_CAREER_COACH_MODEL = 'openai/gpt-oss-20b:free';
const MAX_TOOL_ROUNDS = 3; // guards against a runaway tool-call loop

export const CAREER_COACH_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_career_paths',
      description:
        "Get up to 2 recommended career path roles for the current user, based on their profile skills vs. real job-market demand. Returns each role's match percentage and missing skills ranked by market demand.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_skill_trend',
      description:
        'Get real job-posting data for a specific technical skill: how many current job postings mention it, and its growth rate over a time window.',
      parameters: {
        type: 'object',
        properties: {
          skill: { type: 'string', description: 'Skill name, e.g. "React", "AWS", "Python"' },
          windowDays: {
            type: 'number',
            enum: [30, 90, 365],
            description: 'Trend window in days, defaults to 90',
          },
        },
        required: ['skill'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_salary_range',
      description:
        'Get the real salary range (min/max/median annual USD, from actual job postings) for a role, optionally filtered by region.',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string', description: 'Role name, e.g. "Backend Engineer"' },
          region: { type: 'string', description: 'Optional region filter' },
        },
        required: ['role'],
      },
    },
  },
];

// Never invent numbers — Career Coach only states what a tool call
// returned, and says so honestly when a tool reports insufficient data
// (v2-scope.md §8 Epic 12.4).
const CAREER_COACH_SYSTEM_PROMPT = `You are an AI career coach for a remote software engineering job board.
You help users understand the job market, plan career paths, and set salary expectations.

Rules:
- You MUST call the relevant tool before answering any question involving market data (career paths, skill demand/growth, salary ranges). Never guess or invent a number.
- If a tool returns an error or reports insufficient data, say so plainly instead of making up a plausible-sounding answer.
- Keep answers concise and concrete, grounded only in tool results.
- Reply in the same language as the user's latest message (this product is bilingual, English/Chinese) — do not default to English when the user writes in Chinese.`;

export interface CareerCoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CareerCoachToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export type CareerCoachToolExecutor = (call: CareerCoachToolCall) => Promise<unknown>;

// Distinguishable from a generic failure so the caller (apps/web's route)
// can map it to a specific, actionable API error instead of a flat 502 —
// "try again" is misleading advice for a daily quota that won't reset for
// hours.
export class CareerCoachRateLimitError extends Error {
  constructor() {
    super('OpenRouter rate limit exceeded');
    this.name = 'CareerCoachRateLimitError';
  }
}

function isRateLimitError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { status?: number }).status === 429
  );
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

// Tool execution needs DB access, which packages/ai deliberately doesn't
// have — the caller (apps/web) supplies executeTool, scoped to the
// requesting user. Not streamed: this runs the full tool-calling loop to a
// final text answer first, then the caller streams that text over SSE (see
// apps/web/app/api/v1/career-coach/messages/route.ts) — token-level
// streaming combined with mid-stream tool-call argument accumulation is
// substantially more complex for a feature this size to have any real
// payoff on a free-tier model.
export async function runCareerCoachTurn(
  history: CareerCoachMessage[],
  executeTool: CareerCoachToolExecutor,
): Promise<string> {
  const client = getOpenRouterClient();
  const model = process.env.CAREER_COACH_MODEL ?? DEFAULT_CAREER_COACH_MODEL;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: CAREER_COACH_SYSTEM_PROMPT },
    ...history.map((m): OpenAI.Chat.ChatCompletionMessageParam => ({
      role: m.role,
      content: m.content,
    })),
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let lastError: unknown;
    const response = await callWithFallback(
      (roundModel) =>
        client.chat.completions.create({
          model: roundModel,
          temperature: 0.3,
          max_tokens: 800,
          reasoning_effort: 'low',
          tools: CAREER_COACH_TOOLS,
          messages,
        }),
      { primary: model, fallback: process.env.CAREER_COACH_MODEL_FALLBACK },
      (_model, _attempt, error) => {
        lastError = error;
      },
    );

    if (!response) {
      if (isRateLimitError(lastError)) throw new CareerCoachRateLimitError();
      throw lastError instanceof Error ? lastError : new Error('Career Coach LLM call failed');
    }

    const message = response.choices[0]?.message;
    if (!message) throw new Error('Career Coach returned no response');

    if (!message.tool_calls || message.tool_calls.length === 0) {
      const content = message.content ?? (message as { reasoning?: string }).reasoning;
      if (!content) throw new Error('Career Coach returned empty response');
      return content;
    }

    messages.push(message);

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== 'function') continue;
      const result = await executeTool({
        name: toolCall.function.name,
        arguments: parseToolArguments(toolCall.function.arguments),
      });
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  throw new Error('Career Coach exceeded max tool-call rounds');
}
