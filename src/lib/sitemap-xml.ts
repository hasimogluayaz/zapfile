import type { MetadataRoute } from "next";
import buildSitemap from "@/app/sitemap";
import { TOOL_URL_LOCALES } from "@/lib/localized-routes";
import { SITE_URL } from "@/lib/site-url";

/**
 * The sitemap split per language (`/sitemaps/en.xml`, `/sitemaps/tr.xml`, …)
 * behind an index (`/sitemap-index.xml`). Same entries as `/sitemap.xml`
 * (which IndexNow still reads), in small files: Search Console kept the single
 * 1 MB file on "Couldn't fetch" without ever reading it.
 */
export const SITEMAP_LANGS = ["en", ...TOOL_URL_LOCALES] as const;

function langOf(url: string): string {
  const first = url.slice(SITE_URL.length).split("/").filter(Boolean)[0];
  return (TOOL_URL_LOCALES as readonly string[]).includes(first ?? "") ? first! : "en";
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function entryXml(e: MetadataRoute.Sitemap[number]): string {
  const parts = [`<loc>${esc(e.url)}</loc>`];
  for (const [lang, href] of Object.entries(e.alternates?.languages ?? {})) {
    parts.push(`<xhtml:link rel="alternate" hreflang="${esc(lang)}" href="${esc(String(href))}" />`);
  }
  if (e.lastModified) parts.push(`<lastmod>${new Date(e.lastModified).toISOString()}</lastmod>`);
  if (e.changeFrequency) parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
  if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
  return `<url>\n${parts.join("\n")}\n</url>`;
}

/** One language's sitemap, or null for an unknown name. */
export function languageSitemapXml(lang: string): string | null {
  if (!(SITEMAP_LANGS as readonly string[]).includes(lang)) return null;
  const entries = buildSitemap().filter((e) => langOf(e.url) === lang);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    entries.map(entryXml).join("\n") +
    `\n</urlset>\n`
  );
}

export function sitemapIndexXml(): string {
  const now = new Date().toISOString();
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    SITEMAP_LANGS.map(
      (lang) => `<sitemap>\n<loc>${SITE_URL}/sitemaps/${lang}.xml</loc>\n<lastmod>${now}</lastmod>\n</sitemap>`,
    ).join("\n") +
    `\n</sitemapindex>\n`
  );
}

export const XML_HEADERS = { "Content-Type": "application/xml; charset=utf-8" };
