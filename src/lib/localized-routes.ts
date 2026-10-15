import localizedToolSlugs from "./localized-tool-slugs.json";
import type { Locale } from "./locales";

/**
 * Languages whose tool pages have their own URLs (`/tr/pdf-birlestir`), so
 * search engines index them separately. Other languages switch in place on
 * the English URL. The slug table lives in `localized-tool-slugs.json`
 * (next.config.mjs reads it too, for the Office tools' isolation headers).
 */
export const TOOL_URL_LOCALES = ["tr", "de", "fr"] as const satisfies readonly Locale[];
export type ToolUrlLocale = (typeof TOOL_URL_LOCALES)[number];

const toLocal = localizedToolSlugs as Record<ToolUrlLocale, Record<string, string>>;
const fromLocal = Object.fromEntries(
  TOOL_URL_LOCALES.map((locale) => [
    locale,
    Object.fromEntries(Object.entries(toLocal[locale]).map(([slug, local]) => [local, slug])),
  ]),
) as Record<ToolUrlLocale, Record<string, string>>;

export function isToolUrlLocale(value: string | null | undefined): value is ToolUrlLocale {
  return (TOOL_URL_LOCALES as readonly string[]).includes(value ?? "");
}

/** All `{ locale, localSlug }` pairs, for static params and the sitemap. */
export function localizedToolParams(): { locale: ToolUrlLocale; localSlug: string; slug: string }[] {
  return TOOL_URL_LOCALES.flatMap((locale) =>
    Object.entries(toLocal[locale]).map(([slug, localSlug]) => ({ locale, localSlug, slug })),
  );
}

export function toolSlugFromLocalized(locale: string, localSlug: string): string | undefined {
  return isToolUrlLocale(locale) ? fromLocal[locale][localSlug] : undefined;
}

/** Link to a tool in the given UI language: its own URL when it has one. */
export function toolHref(slug: string, locale: Locale): string {
  if (isToolUrlLocale(locale)) {
    const local = toLocal[locale][slug];
    if (local) return `/${locale}/${local}`;
  }
  return `/tools/${slug}`;
}

/** `/tr/pdf-birlestir` → `{ locale: "tr", slug: "merge-pdf" }`; null for any other path. */
export function parseLocalizedToolPath(
  pathname: string | null | undefined,
): { locale: ToolUrlLocale; slug: string } | null {
  const parts = (pathname ?? "").split("/").filter(Boolean);
  if (parts.length !== 2 || !isToolUrlLocale(parts[0])) return null;
  const slug = fromLocal[parts[0]][parts[1]!];
  return slug ? { locale: parts[0], slug } : null;
}

/**
 * Where a tool page lives in another language: `/tools/merge-pdf` ⇄
 * `/tr/pdf-birlestir`. Null when the path is not a tool page.
 */
export function toolPathForLocale(pathname: string, locale: Locale): string | null {
  const localized = parseLocalizedToolPath(pathname);
  if (localized) return toolHref(localized.slug, locale);
  const m = /^\/tools\/([^/]+)\/?$/.exec(pathname);
  if (m && TOOL_URL_LOCALES.some((l) => toLocal[l][m[1]!])) return toolHref(m[1]!, locale);
  return null;
}

/** hreflang map (paths) for a tool: English URL is the x-default. */
export function toolLanguagePaths(slug: string): Record<string, string> {
  const paths: Record<string, string> = { en: `/tools/${slug}` };
  for (const locale of TOOL_URL_LOCALES) {
    const local = toLocal[locale][slug];
    if (local) paths[locale] = `/${locale}/${local}`;
  }
  paths["x-default"] = `/tools/${slug}`;
  return paths;
}
