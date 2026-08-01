import { registerLocale, getNames, getAlpha2Codes } from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';
import zhLocale from 'i18n-iso-countries/langs/zh.json';

registerLocale(enLocale);
registerLocale(zhLocale);

export type SupportedCountryLocale = 'en' | 'zh';

export interface CountryOption {
  code: string;
  name: string;
}

// Full ISO 3166-1 country list localized for the given UI locale, sorted by
// display name — used by CountrySelect (frontend-spec.md's CountrySelect
// component) to render a searchable list of countries.
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
