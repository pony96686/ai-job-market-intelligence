import { z } from 'zod';
import { getOpenRouterClient } from '../openrouter-client';
import { JOB_PARSING_SYSTEM_PROMPT, buildJobParsingUserPrompt } from '../prompts/job-parsing';
import type { ParsedJobFields } from '@ai-job-market-intelligence/shared/ingestion';

const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
const PARSE_MAX_RETRIES = 2; // initial attempt + 1 retry

const JobLevelSchema = z.enum(['Junior', 'Mid', 'Senior', 'Staff', 'Principal', 'Unknown']);

const JobParseOutputSchema = z.object({
  role: z.string().max(100),
  level: JobLevelSchema,
  skills: z.array(z.string()).max(30),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  remote: z.boolean(),
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
  confidence: 0,
};

async function callLLM(input: ParseJobFieldsInput): Promise<ParsedJobFields> {
  const response = await getOpenRouterClient().chat.completions.create({
    model: process.env.CHAT_MODEL ?? DEFAULT_LLM_MODEL,
    temperature: 0.2,
    max_tokens: 500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: JOB_PARSING_SYSTEM_PROMPT },
      { role: 'user', content: buildJobParsingUserPrompt(input.title, input.description, input.tags) },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error('LLM returned empty response');

  return JobParseOutputSchema.parse(JSON.parse(content));
}

// Never throws: JSON/schema failures retry once, then fall back to a
// confidence=0 result so ingestion is never blocked by a bad LLM response.
export async function parseJobFields(input: ParseJobFieldsInput): Promise<ParsedJobFields> {
  for (let attempt = 1; attempt <= PARSE_MAX_RETRIES; attempt++) {
    try {
      return await callLLM(input);
    } catch {
      if (attempt === PARSE_MAX_RETRIES) return EMPTY_RESULT;
    }
  }
  return EMPTY_RESULT;
}
