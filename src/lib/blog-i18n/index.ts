import type { Locale } from "../locales";
import { toolHref } from "../localized-routes";

/**
 * Translated blog post bodies (markdown), one module per language keyed by
 * post slug. Server-only: imported by the blog pages, never by client code.
 */
const loaders: Partial<Record<Locale, () => Promise<{ default: Record<string, string> }>>> = {
  tr: () => import("./tr"),
  de: () => import("./de"),
  fr: () => import("./fr"),
  es: () => import("./es"),
  pt: () => import("./pt"),
  it: () => import("./it"),
  ja: () => import("./ja"),
  ar: () => import("./ar"),
};

/** The post body in `locale`, with tool links pointing at that language's tool pages. */
export async function localizedPostContent(slug: string, locale: Locale): Promise<string | undefined> {
  const load = loaders[locale];
  if (!load) return undefined;
  const md = (await load()).default[slug];
  return md?.replace(/\]\(\/tools\/([a-z0-9-]+)\)/g, (_, tool: string) => `](${toolHref(tool, locale)})`);
}

/** Whether every post has a body in `locale` (checked by `npm run verify:i18n`). */
export async function missingPostTranslations(locale: Locale, slugs: string[]): Promise<string[]> {
  const load = loaders[locale];
  if (!load) return slugs;
  const all = (await load()).default;
  return slugs.filter((s) => !all[s]);
}
