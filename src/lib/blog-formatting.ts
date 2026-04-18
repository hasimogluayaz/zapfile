import type { Locale } from "./locales";

export { getLocalizedBlogSummary } from "./blog-post-locales";

export const BLOG_DATE_LOCALE: Record<Locale, string> = {
  en: "en-US",
  tr: "tr-TR",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
  it: "it-IT",
  ja: "ja-JP",
  ar: "ar",
};

export function formatBlogDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(BLOG_DATE_LOCALE[locale] ?? "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Parses "5 min read" style strings from blog data. */
export function parseReadMinutes(readTime: string): number {
  const m = readTime.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1]!, 10) : 5;
}
