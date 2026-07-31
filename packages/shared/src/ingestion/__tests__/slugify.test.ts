import { describe, it, expect } from 'vitest';
import { slugify } from '../slugify';

describe('slugify', () => {
  it('normalizes case and spacing to the same slug', () => {
    expect(slugify('Acme Inc')).toBe(slugify('acme inc.'));
    expect(slugify('Acme Inc')).toBe('acme-inc');
  });

  it('collapses punctuation and multiple spaces into single hyphens', () => {
    expect(slugify('Acme, Inc.')).toBe('acme-inc');
    expect(slugify('  Widget   Co  ')).toBe('widget-co');
  });

  it('strips diacritics', () => {
    expect(slugify('Café Corp')).toBe('cafe-corp');
  });
});
