import { describe, it, expect } from 'vitest';
import { parseLLMJson } from '../parse-llm-json';

describe('parseLLMJson', () => {
  it('parses plain JSON with no fence', () => {
    expect(parseLLMJson('{"foo": 1}')).toEqual({ foo: 1 });
  });

  it('strips a ```json fenced response', () => {
    const content = '```json\n{"foo": 1}\n```';
    expect(parseLLMJson(content)).toEqual({ foo: 1 });
  });

  it('strips a bare ``` fence with no language tag', () => {
    const content = '```\n{"foo": 1}\n```';
    expect(parseLLMJson(content)).toEqual({ foo: 1 });
  });

  it('tolerates surrounding whitespace', () => {
    const content = '  \n```json\n{"foo": 1}\n```\n  ';
    expect(parseLLMJson(content)).toEqual({ foo: 1 });
  });

  it('throws on genuinely invalid JSON', () => {
    expect(() => parseLLMJson('not json')).toThrow();
  });
});
