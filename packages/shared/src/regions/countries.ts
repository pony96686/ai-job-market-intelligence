// Named imports from this package fail at runtime under Node's native ESM
// loader (e.g. `node --import tsx`, used by apps/worker's production
// Dockerfile) — its CJS entry point re-exports via `module.exports = library`
// (built up through a require() chain), which cjs-module-lexer can't
// statically resolve into named exports. tsx's own CLI and Vite/vitest are
// more lenient about this and never surfaced the crash locally. A default
// import + runtime destructure works under every execution mode.
import i18nIsoCountries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import zhLocale from 'i18n-iso-countries/langs/zh.json';

const { registerLocale, getNames, getAlpha2Codes } = i18nIsoCountries;

registerLocale(enLocale);
registerLocale(zhLocale);

export type SupportedCountryLocale = 'en' | 'zh';

export interface CountryOption {
  code: string;
  name: string;
}

// Full ISO 3166-1 country list localized for the given UI locale, sorted by
// display name — used by the CountrySelect
// component to render a searchable list of countries.
export function getCountryOptions(locale: SupportedCountryLocale): CountryOption[] {
  // 'alias' gives the common short name (e.g. "United States") instead of
  // the default official/formal name ("United States of America").
  const names = getNames(locale, { select: 'alias' });
  return Object.entries(names)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

const VALID_ALPHA2_CODES = new Set(Object.keys(getAlpha2Codes()));

export function isValidCountryCode(code: string): boolean {
  return VALID_ALPHA2_CODES.has(code.toUpperCase());
}

// English alias names (includes official abbreviations like "UK" for
// "United Kingdom") — always English regardless of a user's UI locale,
// since this matches text sources that are always English: job.location
// (Greenhouse/Lever/Ashby/RemoteOK) and job descriptions
// (infer-from-text.ts's eligibleRegions supplement). Deliberately
// i18n-iso-countries, not Intl.DisplayNames — the latter only returns a
// single canonical name per country with no alias table at all, silently
// losing coverage for common abbreviations (confirmed regression during
// this table's development: swapping to Intl.DisplayNames lost the "UK"
// alias and changed compound names like "Bosnia and Herzegovina" to
// "Bosnia & Herzegovina", breaking real-world matches).
export const COUNTRY_NAME_TO_ALPHA2: ReadonlyMap<string, string> = new Map(
  Object.entries(getNames('en', { select: 'alias' })).map(([code, name]) => [name, code]),
);
