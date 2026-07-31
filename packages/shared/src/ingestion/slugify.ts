// Matches Unicode combining diacritical marks (U+0300-U+036F) left behind by
// NFKD normalization, e.g. turning "e with acute accent" into "e" + a
// combining accent codepoint that this strips.
const COMBINING_DIACRITICS = /[\u0300-\u036f]/g;

// Normalizes company names ("Acme Inc" vs "acme inc.") to the same slug so
// jobs.companyId dedups correctly.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
