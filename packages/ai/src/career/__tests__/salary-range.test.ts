import { describe, it, expect } from 'vitest';
import { getSalaryRange } from '../salary-range';

describe('getSalaryRange', () => {
  it('reports insufficient data below the minimum sample size', () => {
    const result = getSalaryRange('Backend Engineer', 'REMOTE_GLOBAL', [100_000, 110_000, 120_000]);

    expect(result.insufficientData).toBe(true);
    expect(result.sampleSize).toBe(3);
    expect(result.min).toBeNull();
    expect(result.max).toBeNull();
    expect(result.median).toBeNull();
  });

  it('computes min/max/median once the sample size is met', () => {
    const salaries = [
      90_000, 100_000, 110_000, 120_000, 130_000, 140_000, 150_000, 160_000, 170_000, 180_000,
    ];

    const result = getSalaryRange('Backend Engineer', 'REMOTE_GLOBAL', salaries);

    expect(result.insufficientData).toBe(false);
    expect(result.sampleSize).toBe(10);
    expect(result.min).toBe(90_000);
    expect(result.max).toBe(180_000);
    expect(result.median).toBe(135_000); // average of the two middle values
  });

  it('does not mutate the input array while sorting', () => {
    const salaries = [
      180_000, 90_000, 150_000, 100_000, 110_000, 120_000, 130_000, 140_000, 160_000, 170_000,
    ];
    const copy = [...salaries];

    getSalaryRange('Backend Engineer', 'REMOTE_GLOBAL', salaries);

    expect(salaries).toEqual(copy);
  });

  it('computes an odd-length median as the true middle value', () => {
    const salaries = [
      100_000, 110_000, 120_000, 130_000, 140_000, 150_000, 160_000, 170_000, 180_000, 190_000,
      200_000,
    ];

    const result = getSalaryRange('Backend Engineer', 'REMOTE_GLOBAL', salaries);

    expect(result.median).toBe(150_000);
  });
});
