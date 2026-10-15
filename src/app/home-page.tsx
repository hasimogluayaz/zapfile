import type { Metadata } from "next";
import type { Locale } from "@/lib/locales";
import { SITE_URL } from "@/lib/site-url";
import { homeHref, homeLanguagePaths } from "@/lib/localized-routes";
import { homeSeo, OG_LOCALE } from "@/lib/home-seo";

/** Metadata for the home page in `locale` (`/` or `/tr`, `/de`, …). */
export function homeMetadata(locale: Locale): Metadata {
  const { title, description } = homeSeo[locale];
  const path = homeHref(locale);
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  const languages = Object.fromEntries(
    Object.entries(homeLanguagePaths()).map(([lang, p]) => [lang, p === "/" ? SITE_URL : `${SITE_URL}${p}`]),
  );
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      url,
      siteName: "ZapFile",
      title,
      description,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
  };
}
