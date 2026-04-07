export type Locale =
  | "en"
  | "tr"
  | "de"
  | "fr"
  | "es"
  | "pt"
  | "it"
  | "ja"
  | "ar";

export const SUPPORTED_LOCALES: Locale[] = [
  "en",
  "tr",
  "de",
  "fr",
  "es",
  "pt",
  "it",
  "ja",
  "ar",
];

/** Locales with a full string table in i18n.tsx; others use i18n-overrides + English fallback. */
export const LOCALES_FULL_DICTIONARY: Locale[] = ["en", "tr", "de", "fr"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  pt: "Português",
  it: "Italiano",
  ja: "日本語",
  ar: "العربية",
};

export function isRtlLocale(locale: Locale): boolean {
  return locale === "ar";
}
