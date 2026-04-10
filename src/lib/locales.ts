export type Locale =
  | "en"
  | "tr"
  | "de"
  | "fr"
  | "es"
  | "pt"
  | "it"
  | "ja";

export const SUPPORTED_LOCALES: Locale[] = [
  "en",
  "tr",
  "de",
  "fr",
  "es",
  "pt",
  "it",
  "ja",
];

/** Locales with a complete key set in `translations` (es/pt/it/ja are merged from en + i18n-overrides). */
export const LOCALES_FULL_DICTIONARY: Locale[] = [
  "en",
  "tr",
  "de",
  "fr",
  "es",
  "pt",
  "it",
  "ja",
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
};

/** Reserved for future RTL locales; no RTL UI languages are enabled yet. */
export function isRtlLocale(locale: Locale): boolean {
  void locale;
  return false;
}
