import { z } from 'zod';
import { PDFParse } from 'pdf-parse';
import { getOpenRouterClient } from '../openrouter-client';
import { RESUME_PARSING_SYSTEM_PROMPT, buildResumeParsingUserPrompt } from '../prompts/resume-parsing';

const DEFAULT_LLM_MODEL = 'gpt-4o-mini';
const PARSE_MAX_RETRIES = 2;

const ResumeParseOutputSchema = z.object({
  skills: z.array(z.string()).max(50),
  experienceYears: z.number().int().min(0).max(60).nullable(),
  summary: z.string().min(1).max(1000),
});

export interface ResumeParseResult {
  skills: string[];
  experienceYears: number | null;
  summary: string;
}

export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'text/plain') {
    return buffer.toString('utf-8');
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function callLLM(resumeText: string): Promise<ResumeParseResult> {
  const response = await getOpenRouterClient().chat.completions.create({
    model: process.env.CHAT_MODEL ?? DEFAULT_LLM_MODEL,
    temperature: 0.2,
    max_tokens: 600,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: RESUME_PARSING_SYSTEM_PROMPT },
      { role: 'user', content: buildResumeParsingUserPrompt(resumeText) },
    ],
  });

  const content = response.choices[0]?.message.content;
  if (!content) throw new Error('LLM returned empty response');

  return ResumeParseOutputSchema.parse(JSON.parse(content));
}

// Returns null when both attempts fail (JSON parsing / schema validation / API
// error) — the caller persists what it has and leaves resume fields empty
// rather than blocking the rest of the profile_parse job.
export async function parseResumeFields(resumeText: string): Promise<ResumeParseResult | null> {
  for (let attempt = 1; attempt <= PARSE_MAX_RETRIES; attempt++) {
    try {
      return await callLLM(resumeText);
    } catch {
      if (attempt === PARSE_MAX_RETRIES) return null;
    }
  }
  return null;
}
