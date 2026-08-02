// Despite requesting `response_format: { type: 'json_object' }`, some free
// OpenRouter models (e.g. openai/gpt-oss-20b:free) still wrap their response
// in a markdown code fence (```json ... ```), which breaks a bare
// JSON.parse — strip it first if present.
export function parseLLMJson(content: string): unknown {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return JSON.parse(fenceMatch?.[1] ?? trimmed);
}
