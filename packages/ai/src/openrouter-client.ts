import OpenAI from 'openai';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

let client: OpenAI | undefined;

// OpenRouter is the sole LLM/embedding provider (cost priority — free-tier
// models first). Its request format is OpenAI-compatible
// (same SDK, same response_format: json_object structured output), so this is
// still the `openai` package's client, just pointed at OpenRouter by default.
// baseURL stays overridable via OPENAI_BASE_URL for local testing against a
// different compatible endpoint.
export function getOpenRouterClient(): OpenAI {
  client ??= new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL ?? OPENROUTER_BASE_URL,
  });
  return client;
}
