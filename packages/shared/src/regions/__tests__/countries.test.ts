import { describe, it, expect } from 'vitest';
import { getCountryOptions, isValidCountryCode } from '../countries';

describe('getCountryOptions', () => {
  it('returns a full, sorted, localized country list', () => {
    const en = getCountryOptions('en');
    expect(en.length).toBeGreaterThan(190);
    const us = en.find((c) => c.code === 'US');
    expect(us?.name).toBe('United States');

    // sorted by display name
    const names = en.map((c) => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('returns localized Chinese names', () => {
    const zh = getCountryOptions('zh');
    const cn = zh.find((c) => c.code === 'CN');
    expect(cn?.name).toBe('中国');
  });
});

describe('isValidCountryCode', () => {
  it('accepts valid ISO 3166-1 alpha-2 codes', () => {
    expect(isValidCountryCode('US')).toBe(true);
    expect(isValidCountryCode('cn')).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(isValidCountryCode('ZZ')).toBe(false);
    expect(isValidCountryCode('XX')).toBe(false);
  });
});
