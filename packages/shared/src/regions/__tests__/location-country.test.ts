import { describe, it, expect } from 'vitest';
import {
  extractLocationCountry,
  mapLocationRestrictionsToRegionBuckets,
} from '../location-country';

describe('extractLocationCountry', () => {
  it('extracts the single country from a simple location string', () => {
    expect(extractLocationCountry('Poland')).toBe('PL');
  });

  it('extracts the country from a "Remote - Country" style string', () => {
    expect(extractLocationCountry('Remote - Germany')).toBe('DE');
  });

  // i18n-iso-countries' own alias for BA/TT is "and"-joined ("Bosnia and
  // Herzegovina"), matching how real postings almost always write it — this
  // is job-ingestion.md §5.5's own canonical "Remote - {Country}" example.
  it('resolves "and"-joined compound country names', () => {
    expect(extractLocationCountry('Remote - Bosnia and Herzegovina')).toBe('BA');
    expect(extractLocationCountry('Remote - Trinidad and Tobago')).toBe('TT');
  });

  // normalizeAmpersand is direction-agnostic — a posting written with "&"
  // instead of "and" still matches, without needing to know which
  // formatting the underlying country-name table happens to use.
  it('also resolves the same compound names written with "&"', () => {
    expect(extractLocationCountry('Remote - Bosnia & Herzegovina')).toBe('BA');
    expect(extractLocationCountry('Remote - Trinidad & Tobago')).toBe('TT');
  });

  it('returns null when no country is mentioned', () => {
    expect(extractLocationCountry('Remote')).toBeNull();
    expect(extractLocationCountry('Worldwide')).toBeNull();
    expect(extractLocationCountry('EMEA')).toBeNull();
  });

  it('returns null when more than one country is mentioned', () => {
    expect(extractLocationCountry('Remote - United States, Canada')).toBeNull();
  });

  it('recognizes the "US"/"USA" abbreviations via MANUAL_COUNTRY_ALIASES', () => {
    expect(extractLocationCountry('Remote - US')).toBe('US');
    expect(extractLocationCountry('Remote - USA')).toBe('US');
  });

  it('does not match "us" as part of an ordinary word or lowercase mention (case-sensitive alias matching)', () => {
    expect(extractLocationCountry('Join us and help us build great products')).toBeNull();
    expect(extractLocationCountry('About us: we are a remote-first company')).toBeNull();
  });

  // "UK" doesn't need a MANUAL_COUNTRY_ALIASES entry — i18n-iso-countries'
  // own alias *is* "UK" for GB (not "United Kingdom"), so it's already
  // covered by COUNTRY_NAME_TO_ALPHA2 without any extra work.
  it('recognizes the "UK" abbreviation via the official country-name alias table', () => {
    expect(extractLocationCountry('Remote - UK')).toBe('GB');
  });

  it('accepts an array of texts (Himalayas locationRestrictions)', () => {
    expect(extractLocationCountry(['United States'])).toBe('US');
    expect(extractLocationCountry(['United States', 'Canada'])).toBeNull();
  });
});

describe('mapLocationRestrictionsToRegionBuckets', () => {
  it('maps a country name to its region bucket', () => {
    expect(mapLocationRestrictionsToRegionBuckets(['Brazil'])).toEqual(['LATAM']);
  });

  it('matches a direct bucket name case-insensitively', () => {
    expect(mapLocationRestrictionsToRegionBuckets(['eu'])).toEqual(['EU']);
  });

  it('dedupes buckets from multiple restrictions mapping to the same one', () => {
    expect(mapLocationRestrictionsToRegionBuckets(['Germany', 'France'])).toEqual(['EU']);
  });

  // Himalayas' own data might use "&" where the country-name table uses
  // "and" (or vice versa) — the comparison normalizes both sides.
  it('matches a compound country name regardless of "&" vs "and"', () => {
    expect(mapLocationRestrictionsToRegionBuckets(['Trinidad & Tobago'])).toEqual(['LATAM']);
    expect(mapLocationRestrictionsToRegionBuckets(['Trinidad and Tobago'])).toEqual(['LATAM']);
  });

  it('returns an empty array for unrecognized restrictions', () => {
    expect(mapLocationRestrictionsToRegionBuckets(['Worldwide'])).toEqual([]);
  });

  it('returns an empty array for an empty input', () => {
    expect(mapLocationRestrictionsToRegionBuckets([])).toEqual([]);
  });
});
