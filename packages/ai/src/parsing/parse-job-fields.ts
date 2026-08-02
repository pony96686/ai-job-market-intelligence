import { z } from 'zod';
import { getOpenRouterClient } from '../openrouter-client';
import { JOB_PARSING_SYSTEM_PROMPT, buildJobParsingUserPrompt } from '../prompts/job-parsing';
import type { ParsedJobFields } from '@ai-job-market-intelligence/shared/ingestion';

// OpenRouter model slugs require a 'vendor/' prefix — a bare model name gets
// rejected with a 400 (see packages/ai/src/scoring/llm-score.ts for the same
// issue and fix).
const DEFAULT_LLM_MODEL = 'openai/gpt-oss-20b:free';
const PARSE_MAX_RETRIES = 2; // initial attempt + 1 retry

const JobLevelSchema = z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Principal', 'Unknown']);
const RegionBucketSchema = z.enum(['US', 'EU', 'UK', 'APAC', 'LATAM', 'REMOTE_GLOBAL', 'OTHER']);

const JobParseOutputSchema = z.object({
  role: z.string().max(100),
  level: JobLevelSchema,
  skills: z.array(z.string()).max(30),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  remote: z.boolean(),
  eligibleRegions: z.array(RegionBucketSchema).max(7),
  confidence: z.number().min(0).max(1),
});

export interface ParseJobFieldsInput {
  title: string;
  description: string;
  tags: string[];
}

const EMPTY_RESULT: ParsedJobFields = {
  role: '',
  level: 'Unknown',
  skills: [],
  salaryMin: null,
  salaryMax: null,
  remote: false,
  eligibleRegions: [],
  confidence: 0,
};

async function callLLM(input: ParseJobFieldsInput): Promise<ParsedJobFields> {
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
      { role: 'system', content: JOB_PARSING_SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildJobParsingUserPrompt(input.title, input.description, input.tags),
      },
    ],
  });

  const message = response.choices[0]?.message;
  // Some free OpenRouter models put their answer in a non-standard
  // `reasoning` field and leave `content` null instead of respecting
  // response_format — fall back to it before giving up.
  const content = message?.content ?? (message as { reasoning?: string } | undefined)?.reasoning;
  if (!content) throw new Error('LLM returned empty response');

  return JobParseOutputSchema.parse(JSON.parse(content));
}

// Never throws: JSON/schema failures retry once, then fall back to a
// confidence=0 result so ingestion is never blocked by a bad LLM response.
export async function parseJobFields(input: ParseJobFieldsInput): Promise<ParsedJobFields> {
  for (let attempt = 1; attempt <= PARSE_MAX_RETRIES; attempt++) {
    try {
      return await callLLM(input);
    } catch (error) {
      console.error(`[parse-job-fields] attempt ${attempt}/${PARSE_MAX_RETRIES} failed:`, error);
      if (attempt === PARSE_MAX_RETRIES) return EMPTY_RESULT;
    }
  }
  return EMPTY_RESULT;
}
