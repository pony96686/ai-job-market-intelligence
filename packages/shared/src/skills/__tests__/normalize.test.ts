import { describe, it, expect } from 'vitest';
import { normalizeSkill } from '../normalize';

function slugs(raw: string): string[] {
  return normalizeSkill(raw).map((s) => s.slug);
}

describe('normalizeSkill', () => {
  it('merges common synonym variants into the same canonical slug', () => {
    expect(slugs('js')).toEqual(['javascript']);
    expect(slugs('javascript')).toEqual(['javascript']);
    expect(slugs('node')).toEqual(['node.js']);
    expect(slugs('nodejs')).toEqual(['node.js']);
    expect(slugs('k8s')).toEqual(['kubernetes']);
    expect(slugs('postgres')).toEqual(['postgresql']);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(slugs('  JS  ')).toEqual(['javascript']);
    expect(slugs('Kubernetes')).toEqual(['kubernetes']);
  });

  it('gives known canonical slugs a proper display name', () => {
    expect(normalizeSkill('js')[0]?.name).toBe('JavaScript');
    expect(normalizeSkill('k8s')[0]?.name).toBe('Kubernetes');
    expect(normalizeSkill('nodejs')[0]?.name).toBe('Node.js');
    expect(normalizeSkill('csharp')[0]?.name).toBe('C#');
  });

  // SKILL_SYNONYMS doubles as a whitelist — a
  // raw tag with no synonym entry (whole-tag or as a split token) is
  // discarded, not passed through, since extractTagsAsSkills copies source
  // tags verbatim and many of those are job titles or industry categories,
  // not skills.
  it('discards a skill with no whitelist entry', () => {
    expect(normalizeSkill('some-niche-tool')).toEqual([]);
  });

  it('discards job-title/industry tags that slipped in from extractTagsAsSkills', () => {
    expect(normalizeSkill('business-development')).toEqual([]);
    expect(normalizeSkill('radiology')).toEqual([]);
    expect(normalizeSkill('b2b-sales')).toEqual([]);
  });

  // extractTagsAsSkills copies raw source tags verbatim, and those are
  // frequently compound job-title phrases that bury a real skill token next
  // to noise words that just aren't in the whitelist (see the tokenization
  // fallback above).
  it('falls back to per-token matching when the whole tag misses', () => {
    expect(slugs('senior-azure-devops-engineer')).toEqual(['azure', 'devops']);
    expect(slugs('cloud-devops-engineer')).toEqual(['devops']);
    expect(slugs('senior-aws-devops-engineer')).toEqual(['aws', 'devops']);
  });

  it('prefers the whole-tag match over tokenizing when both would apply', () => {
    expect(slugs('machine learning')).toEqual(['machine-learning']);
  });

  it('dedupes repeated token matches within a single tag', () => {
    expect(slugs('devops-devops-engineer')).toEqual(['devops']);
  });

  // Short skill names ("go") are common English words/letters on their own —
  // allowing them through the tokenization fallback would false-positive on
  // unrelated compound tags. They still match via the whole-tag exact-match
  // tier, just never via a split token.
  it('only matches short skill names via whole-tag exact match, not tokenization', () => {
    expect(slugs('go')).toEqual(['go']);
    expect(slugs('go-getter')).toEqual([]);
    expect(slugs('go-developer')).toEqual([]);
  });
});
