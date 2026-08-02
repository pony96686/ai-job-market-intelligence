import { z } from 'zod';
import { getOpenRouterClient } from '../openrouter-client';
import { SCORING_SYSTEM_PROMPT } from '../prompts/scoring-system';
import { buildScoringUserPrompt } from '../prompts/scoring-user';
import type { JobInput, ProfileInput } from '../types';

const DEFAULT_LLM_MODEL = 'openai/gpt-oss-20b:free';
const LLM_MAX_RETRIES = 2; // initial attempt + 1 retry

const LLMScoreOutputSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasoning: z.string().min(10).max(300),
  strengths: z.array(z.string()).max(6),
  skill_gap: z.array(z.string()).max(10),
});

export interface LLMScoreResult {
  score: number;
  reasoning: string;
  strengths: string[];
  skillGap: string[];
}

async function callLLM(profile: ProfileInput, job: JobInput): Promise<LLMScoreResult> {
  const response = await getOpenRouterClient().chat.completions.create({
    model: process.env.CHAT_MODEL ?? DEFAULT_LLM_MODEL,
    temperature: 0.2,
    // gpt-oss-20b is a reasoning model: with a tight token budget it can burn
    // the whole budget on chain-of-thought and return empty `content`.
    // reasoning_effort caps that spend, and the higher max_tokens leaves
    // headroom for the final JSON after reasoning.
    max_tokens: 1000,
    reasoning_effort: 'low',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SCORING_SYSTEM_PROMPT },
      { role: 'user', content: buildScoringUserPrompt(profile, job) },
    ],
  });

  const message = response.choices[0]?.message;
  // Some free OpenRouter models put their answer in a non-standard
  // `reasoning` field and leave `content` null instead of respecting
  // response_format — fall back to it before giving up.
  const content = message?.content ?? (message as { reasoning?: string } | undefined)?.reasoning;
  if (!content) throw new Error('LLM returned empty response');

  const parsed = LLMScoreOutputSchema.parse(JSON.parse(content));
  return {
    score: parsed.score,
    reasoning: parsed.reasoning,
    strengths: parsed.strengths,
    skillGap: parsed.skill_gap,
  };
}

// Returns null when both attempts fail (JSON parsing / schema validation / API
// error) — the caller falls back to rule_score in that case
export async function computeLLMScore(
  profile: ProfileInput,
  job: JobInput,
): Promise<LLMScoreResult | null> {
  for (let attempt = 1; attempt <= LLM_MAX_RETRIES; attempt++) {
    try {
      return await callLLM(profile, job);
    } catch (error) {
      console.error(`[llm-score] attempt ${attempt}/${LLM_MAX_RETRIES} failed:`, error);
      if (attempt === LLM_MAX_RETRIES) return null;
    }
  }
  return null;
}
