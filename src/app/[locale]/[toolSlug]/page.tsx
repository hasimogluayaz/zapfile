import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/lib/tools";
import { SITE_URL } from "@/lib/site-url";
import {
  toolLanguagePaths,
  toolSlugFromLocalized,
} from "@/lib/localized-routes";
import { toolSeoTr } from "@/lib/tool-seo-tr";
import { toolSeoDe } from "@/lib/tool-seo-de";
import { toolSeoFr } from "@/lib/tool-seo-fr";
import { toolSeoEs } from "@/lib/tool-seo-es";
import { toolSeoPt } from "@/lib/tool-seo-pt";
import { toolSeoIt } from "@/lib/tool-seo-it";
import { toolSeoJa } from "@/lib/tool-seo-ja";
import { toolSeoAr } from "@/lib/tool-seo-ar";
import ToolPage from "./tool-page";

/**
 * A tool in another language on its own URL (`/tr/pdf-birlestir`), so search
 * engines index it in that language. The page is the same component as
 * `/tools/<slug>`; the I18nProvider takes the language from the path.
 */

type Params = { locale: string; toolSlug: string };

const seo: Record<string, Record<string, { title: string; description: string }>> = {
  tr: toolSeoTr,
  de: toolSeoDe,
  fr: toolSeoFr,
  es: toolSeoEs,
  pt: toolSeoPt,
  it: toolSeoIt,
  ja: toolSeoJa,
  ar: toolSeoAr,
};

const OG_LOCALE: Record<string, string> = {
  tr: "tr_TR",
  de: "de_DE",
  fr: "fr_FR",
  es: "es_ES",
  pt: "pt_BR",
  it: "it_IT",
  ja: "ja_JP",
  ar: "ar_AR",
};

// Rendered per request like every page (the root layout reads cookies).
// Don't add `dynamicParams = false`: with nothing prerendered, Vercel then
// answers 404 for every path. Unknown slugs hit notFound() below.
export const dynamic = "force-dynamic";

function resolve(params: Params) {
  const slug = toolSlugFromLocalized(params.locale, params.toolSlug);
  const tool = slug ? getToolBySlug(slug) : undefined;
  const meta = slug ? seo[params.locale]?.[slug] : undefined;
  if (!slug || !tool || !meta) return null;
  return { slug, tool, meta };
}

function absoluteLanguages(slug: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(toolLanguagePaths(slug)).map(([lang, path]) => [lang, `${SITE_URL}${path}`]),
  );
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const r = resolve(params);
  if (!r) return {};
  const url = `${SITE_URL}/${params.locale}/${params.toolSlug}`;
  const title = `${r.meta.title} | ZapFile`;
  const ogImage = `${SITE_URL}/api/og?slug=${encodeURIComponent(r.slug)}`;
  return {
    title: { absolute: title },
    description: r.meta.description,
    openGraph: {
      title,
      description: r.meta.description,
      url,
      siteName: "ZapFile",
      type: "website",
      locale: OG_LOCALE[params.locale],
      images: [{ url: ogImage, width: 1200, height: 630, alt: r.meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: r.meta.description,
      images: [ogImage],
    },
    alternates: { canonical: url, languages: absoluteLanguages(r.slug) },
  };
}

export default function LocalizedToolPage({ params }: { params: Params }) {
  const r = resolve(params);
  if (!r) notFound();
  const { slug, meta } = r;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: meta.title.split(" – ")[0],
    url: `${SITE_URL}/${params.locale}/${params.toolSlug}`,
    inLanguage: params.locale,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    description: meta.description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ToolPage slug={slug} />
    </>
  );
}
