import type { Metadata } from "next";
import { getToolBySlug } from "@/lib/tools";

const BASE = "https://zapfile.xyz";

const HREFLANG_LANGS = [
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
] as const;

function toolLanguages(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const lang of HREFLANG_LANGS) {
    out[lang] = `${BASE}${path}?lang=${lang}`;
  }
  out["x-default"] = `${BASE}${path}`;
  return out;
}

export function buildToolMetadata(slug: string): Metadata {
  const tool = getToolBySlug(slug);
  if (!tool) {
    return {
      title: "Tool | ZapFile",
      description: "Free online file tools in your browser.",
    };
  }

  const ogImage = `${BASE}/api/og?slug=${encodeURIComponent(slug)}`;

  return {
    title: tool.metaTitle,
    description: tool.metaDescription,
    openGraph: {
      title: tool.metaTitle,
      description: tool.metaDescription,
      url: `${BASE}/tools/${slug}`,
      siteName: "ZapFile",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: tool.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: tool.metaTitle,
      description: tool.metaDescription,
      images: [ogImage],
    },
    alternates: {
      canonical: `${BASE}/tools/${slug}`,
      languages: toolLanguages(`/tools/${slug}`),
    },
  };
}
