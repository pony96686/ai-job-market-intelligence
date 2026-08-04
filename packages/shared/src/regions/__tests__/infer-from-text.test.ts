import { describe, it, expect } from 'vitest';
import { inferEligibleRegionsFromText } from '../infer-from-text';

describe('inferEligibleRegionsFromText', () => {
  it('detects a LATAM timezone restriction', () => {
    expect(
      inferEligibleRegionsFromText(
        'This is a full-time remote position for specialists located in LATAM time zones close to the US.',
      ),
    ).toEqual(['LATAM']);
  });

  it('detects an explicit EU-only restriction regardless of case', () => {
    expect(
      inferEligibleRegionsFromText(
        'Remote within the European Union.\nAPPLICANTS MUST BE BASED IN THE EU.',
      ),
    ).toEqual(['EU']);
  });

  it('detects a specific country named after "must be based in/anywhere in"', () => {
    expect(
      inferEligibleRegionsFromText(
        'Must be based anywhere in Australia, a citizen, and ideally local.',
      ),
    ).toEqual(['APAC']);
    expect(
      inferEligibleRegionsFromText('Must be based in Mexico and available to work remotely.'),
    ).toEqual(['LATAM']);
  });

  it('detects a US citizenship requirement', () => {
    expect(
      inferEligibleRegionsFromText(
        'WORK AUTHORIZATION/SECURITY CLEARANCE\nU.S. CITIZEN\nSECRET CLEARANCE',
      ),
    ).toEqual(['US']);
  });

  it('detects "right to work in United States"', () => {
    expect(
      inferEligibleRegionsFromText(
        'To fulfil this role, you must hold valid right to work in United States.',
      ),
    ).toEqual(['US']);
  });

  it('returns an empty array for a generic remote posting with no stated restriction', () => {
    expect(
      inferEligibleRegionsFromText(
        'This is a fully remote position, work from anywhere in the world.',
      ),
    ).toEqual([]);
  });

  it('does not false-positive on a bare mention of a region name with no restriction language', () => {
    expect(
      inferEligibleRegionsFromText(
        'We are expanding our footprint in the APAC region as part of our global growth.',
      ),
    ).toEqual([]);
    expect(
      inferEligibleRegionsFromText('Our team has 200+ colleagues in North America, EMEA and APAC.'),
    ).toEqual([]);
  });
});
