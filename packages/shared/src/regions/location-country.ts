import type { RegionBucket } from '../schemas/common';
import { escapeRegExp } from '../utils/regex';
import { COUNTRY_NAME_TO_ALPHA2 } from './countries';
import { mapCountryToRegionBucket } from './country-region-map';

// Manually curated, tested gaps in COUNTRY_NAME_TO_ALPHA2's alias coverage —
// i18n-iso-countries registers "UK" as an alias for "United Kingdom" but has
// no "US" alias for "United States", and "Remote - US" is an extremely
// common phrasing that would otherwise fall back to the less-precise
// eligibleRegions signal (not an error, just lower precision). Add a new
// entry only after confirming a real miss like this one — not a preventive
// grab-bag of every abbreviation that might theoretically show up. "UK"
// itself does NOT belong here — the alias table already covers it, and
// duplicating it here would just be two places to keep in sync.
//
// MUST stay case-sensitive matching (no 'i' flag below) — unlike a full
// country name, "us" is an ordinary English word ("join us", "about us" are
// everywhere in job postings) that a case-insensitive match would
// misidentify as the country.
const MANUAL_COUNTRY_ALIASES: Record<string, string> = {
  US: 'US',
  USA: 'US',
};

// "&" and "and" are treated as equivalent in compound country names
// ("Bosnia and Herzegovina" / "Trinidad & Tobago") — real job postings
// overwhelmingly write "and", but normalizing both sides means neither the
// country-name table's own formatting nor a posting's occasional "&" can
// cause a miss. Direction-agnostic on purpose, so this doesn't need
// revisiting if the underlying country-name source ever changes again.
function normalizeAmpersand(text: string): string {
  return text.replace(/\s*&\s*/g, ' and ');
}

// A posting's raw `location` text is inconsistent free text ("Poland",
// "Remote - Bosnia and Herzegovina", "EMEA") — this only extracts a country
// when exactly one country name appears in it. Zero matches (generic
// "Remote"/"Worldwide") or multiple matches ("Remote - US, Canada") both
// return null rather than guess, matching eligibleRegions' own "sooner
// empty than fabricated" extraction principle.
export function extractLocationCountry(locationText: string | string[]): string | null {
  const texts = Array.isArray(locationText) ? locationText : [locationText];
  const matched = new Set<string>();
  for (const rawText of texts) {
    const text = normalizeAmpersand(rawText);
    for (const [alias, alpha2] of Object.entries(MANUAL_COUNTRY_ALIASES)) {
      if (new RegExp(`\\b${alias}\\b`).test(text)) matched.add(alpha2); // case-sensitive, no 'i' flag
    }
    for (const [countryName, alpha2] of COUNTRY_NAME_TO_ALPHA2) {
      const normalizedName = normalizeAmpersand(countryName);
      if (new RegExp(`\\b${escapeRegExp(normalizedName)}\\b`, 'i').test(text)) matched.add(alpha2);
    }
  }
  return matched.size === 1 ? matched.values().next().value! : null;
}

const DIRECT_BUCKET_NAMES: ReadonlySet<RegionBucket> = new Set(['US', 'EU', 'UK', 'APAC', 'LATAM']);

function isDirectBucketName(value: string): value is RegionBucket {
  return DIRECT_BUCKET_NAMES.has(value.toUpperCase() as RegionBucket);
}

// Himalayas' own `locationRestrictions` array is already a curated list of
// discrete values (e.g. ["United States"], ["EU"]) rather than prose, so
// this matches each entry as a whole (case-insensitive, trimmed) instead of
// scanning for a substring — unlike extractLocationCountry above, which has
// to find a country name embedded in a full sentence.
export function mapLocationRestrictionsToRegionBuckets(restrictions: string[]): RegionBucket[] {
  const buckets = new Set<RegionBucket>();
  for (const raw of restrictions) {
    const restriction = raw.trim();
    if (!restriction) continue;

    if (isDirectBucketName(restriction)) {
      buckets.add(restriction.toUpperCase() as RegionBucket);
      continue;
    }

    // Exact match first (COUNTRY_NAME_TO_ALPHA2's keys are already
    // well-formed alias names); case-insensitive scan (with "&"/"and"
    // normalized on both sides) as a fallback for minor formatting
    // differences in Himalayas' own data. No MANUAL_COUNTRY_ALIASES lookup
    // here — Himalayas' locationRestrictions entries are always a full
    // country name, never an abbreviation like "US".
    const normalizedRestriction = normalizeAmpersand(restriction);
    const alpha2 =
      COUNTRY_NAME_TO_ALPHA2.get(restriction) ??
      [...COUNTRY_NAME_TO_ALPHA2].find(
        ([name]) => normalizeAmpersand(name).toLowerCase() === normalizedRestriction.toLowerCase(),
      )?.[1];
    if (alpha2) buckets.add(mapCountryToRegionBucket(alpha2));
  }
  return [...buckets];
}
