import type { Locale } from "./locales";

/**
 * Map ISO 3166-1 alpha-2 country (from Vercel / CDN geo) to UI locale.
 * Unlisted countries fall back to English.
 */
const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  TR: "tr",
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
  FR: "fr",
  MC: "fr",
  LU: "fr",
  BE: "fr",
  ES: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  CL: "es",
  PE: "es",
  EC: "es",
  UY: "es",
  PY: "es",
  BO: "es",
  CR: "es",
  GT: "es",
  HN: "es",
  NI: "es",
  PA: "es",
  DO: "es",
  SV: "es",
  PR: "es",
  PT: "pt",
  BR: "pt",
  AO: "pt",
  MZ: "pt",
  IT: "it",
  SM: "it",
  VA: "it",
  JP: "ja",
  IL: "en",
};

export function localeFromCountryCode(country: string | undefined | null): Locale {
  if (!country || country === "XX") return "en";
  return COUNTRY_TO_LOCALE[country.toUpperCase()] ?? "en";
}
