import { describe, it, expect } from 'vitest';
import { computeRuleScore } from '../rule-score';
import type { JobInput } from '../../types';

const job: JobInput = {
  title: 'Senior Backend Engineer',
  company: 'Acme',
  tags: ['node', 'typescript'],
  description: 'We need someone strong in Node.js and TypeScript.',
};

describe('computeRuleScore', () => {
  it('full skill match + exact seniority match + no role match = 85', () => {
    // skillScore: 2/2 matched * 60 = 60
    // experienceScore: |7.5 - 7.5| = 0 <= 2 -> 25 (senior mid = 7.5)
    // roleScore: 'Nonexistent Role' doesn't match title -> 0
    const profile = {
      skills: ['Node.js', 'TypeScript'],
      experienceYears: 7.5,
      preferredRoles: ['Nonexistent Role'],
    };
    expect(computeRuleScore(profile, job)).toBe(85);
  });

  it('no skills contributes 0 to skill_score', () => {
    // skillScore: 0 (empty skills array)
    // experienceScore: |7.5 - 7.5| = 0 -> 25
    // roleScore: 0
    const profile = { skills: [], experienceYears: 7.5, preferredRoles: [] };
    expect(computeRuleScore(profile, job)).toBe(25);
  });

  it('senior title + 8 years experience -> experience_score = 25', () => {
    // |8 - 7.5| = 0.5 <= 2 -> 25
    const profile = { skills: [], experienceYears: 8, preferredRoles: [] };
    expect(computeRuleScore(profile, job)).toBe(25);
  });

  it('matching preferred role contributes role_score = 15', () => {
    // experienceYears far from any seniority bucket -> experience_score = 5
    // preferredRoles matches title -> role_score = 15
    const profile = { skills: [], experienceYears: 100, preferredRoles: ['Backend Engineer'] };
    expect(computeRuleScore(profile, job)).toBe(20); // 0 (skill) + 5 (exp, far) + 15 (role)
  });
});
