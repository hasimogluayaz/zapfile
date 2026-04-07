export type Locale =
  | "en"
  | "tr"
  | "de"
  | "fr"
  | "es"
  | "pt"
  | "it"
  | "ja"
  | "ar"
  | "he";

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
  "he",
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
  he: "עברית",
};

export function isRtlLocale(locale: Locale): boolean {
  return locale === "ar" || locale === "he";
}
