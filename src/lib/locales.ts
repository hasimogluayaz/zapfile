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

/** Locales with a complete key set in `translations` (es/pt/it/ja/ar are merged from en + overrides). */
export const LOCALES_FULL_DICTIONARY: Locale[] = [
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
