import { describe, it, expect } from 'vitest';
import { mapCountryToRegionBucket } from '../country-region-map';

describe('mapCountryToRegionBucket', () => {
  it('maps US to the US bucket', () => {
    expect(mapCountryToRegionBucket('US')).toBe('US');
  });

  it('maps GB to the UK bucket', () => {
    expect(mapCountryToRegionBucket('GB')).toBe('UK');
  });

  it('maps EU member states to the EU bucket', () => {
    expect(mapCountryToRegionBucket('DE')).toBe('EU');
    expect(mapCountryToRegionBucket('FR')).toBe('EU');
  });

  it('maps APAC countries to the APAC bucket', () => {
    expect(mapCountryToRegionBucket('CN')).toBe('APAC');
    expect(mapCountryToRegionBucket('JP')).toBe('APAC');
    expect(mapCountryToRegionBucket('AU')).toBe('APAC');
  });

  it('maps LATAM countries to the LATAM bucket', () => {
    expect(mapCountryToRegionBucket('BR')).toBe('LATAM');
    expect(mapCountryToRegionBucket('MX')).toBe('LATAM');
  });

  it('falls back to OTHER for countries not in any explicit set', () => {
    expect(mapCountryToRegionBucket('EG')).toBe('OTHER'); // Egypt
    expect(mapCountryToRegionBucket('CA')).toBe('OTHER'); // Canada
  });

  it('is case-insensitive', () => {
    expect(mapCountryToRegionBucket('us')).toBe('US');
    expect(mapCountryToRegionBucket('de')).toBe('EU');
  });
});
