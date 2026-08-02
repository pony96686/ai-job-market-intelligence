import { describe, it, expect } from 'vitest';
import { getCareerPathRecommendations, type CareerPathRoleJobs } from '../career-path';

function role(name: string, skillsPerJob: string[][]): CareerPathRoleJobs {
  return { role: name, jobs: skillsPerJob.map((skills) => ({ skills })) };
}

describe('getCareerPathRecommendations', () => {
  it("excludes a role with zero overlap with the user's skills", () => {
    const candidates = [role('Mobile Engineer', [['swift'], ['kotlin'], ['swift', 'kotlin']])];

    const results = getCareerPathRecommendations(['python', 'django'], candidates);

    expect(results).toEqual([]);
  });

  it('excludes a role the user already fully covers (no gap left)', () => {
    const candidates = [role('Backend Engineer', [['python'], ['python', 'django']])];

    const results = getCareerPathRecommendations(['python', 'django'], candidates);

    expect(results).toEqual([]);
  });

  it('recommends a role with partial overlap and reports the missing skills', () => {
    const candidates = [
      role('Backend Engineer', [
        ['python', 'django'],
        ['python', 'postgresql'],
      ]),
    ];

    const results = getCareerPathRecommendations(['python'], candidates);

    expect(results).toHaveLength(1);
    expect(results[0]!.role).toBe('Backend Engineer');
    expect(results[0]!.matchPercent).toBe(33); // 1 of 3 required skills (python) already known
    expect(results[0]!.missingSkills.map((s) => s.slug).sort()).toEqual(['django', 'postgresql']);
  });

  it('caps recommendations at 2 and ranks by missing-skill demand', () => {
    const candidates = [
      role('Data Engineer', [['python', 'spark']]), // 1 job of missing-skill demand
      role('Backend Engineer', [
        ['python', 'django'],
        ['python', 'django'],
        ['python', 'django'],
      ]), // django mentioned 3x — highest demand
      role('DevOps Engineer', [
        ['python', 'kubernetes'],
        ['python', 'kubernetes'],
      ]), // 2x
    ];

    const results = getCareerPathRecommendations(['python'], candidates);

    expect(results).toHaveLength(2);
    expect(results[0]!.role).toBe('Backend Engineer');
    expect(results[1]!.role).toBe('DevOps Engineer');
  });

  it('weights missing skills by growth rate when provided', () => {
    const candidates = [
      role('Backend Engineer', [
        ['python', 'django'],
        ['python', 'rust'],
      ]),
    ];
    // django and rust both mentioned once — without growth data they'd tie;
    // rust's strong growth should push it to the top of missingSkills.
    const growth = new Map([['rust', 200]]);

    const results = getCareerPathRecommendations(['python'], candidates, growth);

    expect(results[0]!.missingSkills[0]!.slug).toBe('rust');
  });

  it('dedupes synonym variants of the same skill within a single job', () => {
    const candidates = [role('Backend Engineer', [['js', 'javascript', 'python']])];

    const results = getCareerPathRecommendations(['python'], candidates);

    expect(results[0]!.missingSkills).toHaveLength(1);
    expect(results[0]!.missingSkills[0]!.slug).toBe('javascript');
    expect(results[0]!.missingSkills[0]!.jobCount).toBe(1); // not 2 — same job, same canonical skill
  });

  it('returns an empty array when no candidate role has usable skill data', () => {
    const candidates = [role('Backend Engineer', [['business-development']])]; // not on the whitelist

    const results = getCareerPathRecommendations(['python'], candidates);

    expect(results).toEqual([]);
  });
});
