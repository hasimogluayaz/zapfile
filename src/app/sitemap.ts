import { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { getImageConversions } from "@/lib/conversions";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site-url";
import {
  TOOL_URL_LOCALES,
  blogHref,
  blogLanguagePaths,
  homeHref,
  homeLanguagePaths,
  localizedToolParams,
  toolLanguagePaths,
} from "@/lib/localized-routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_URL;

  // Every language version of a tool lists all of them (hreflang).
  const languages = (slug: string) =>
    Object.fromEntries(
      Object.entries(toolLanguagePaths(slug))
        .filter(([lang]) => lang !== "x-default")
        .map(([lang, path]) => [lang, `${baseUrl}${path}`]),
    );

  const toolPages: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${baseUrl}/tools/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
    alternates: { languages: languages(tool.slug) },
  }));

  const localizedToolPages: MetadataRoute.Sitemap = localizedToolParams().map(
    ({ locale, localSlug, slug }) => ({
      url: `${baseUrl}/${locale}/${localSlug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: languages(slug) },
    }),
  );

  let imageConversionPages: MetadataRoute.Sitemap = [];
  try {
    imageConversionPages = getImageConversions().map((c) => ({
      url: `${baseUrl}/tools/convert-image/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch {}

  const blogLanguages = (slug?: string) =>
    Object.fromEntries(
      Object.entries(blogLanguagePaths(slug))
        .filter(([lang]) => lang !== "x-default")
        .map(([lang, path]) => [lang, `${baseUrl}${path}`]),
    );

  // Home, blog index and posts exist in every language (English at / and /blog).
  const pageLocales = ["en", ...TOOL_URL_LOCALES] as const;
  const blogIndexPages: MetadataRoute.Sitemap = pageLocales.map((locale) => ({
    url: `${baseUrl}${blogHref(locale)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
    alternates: { languages: blogLanguages() },
  }));

  let blogPostPages: MetadataRoute.Sitemap = [];
  try {
    blogPostPages = getAllPosts().flatMap((post) =>
      pageLocales.map((locale) => ({
        url: `${baseUrl}${blogHref(locale, post.slug)}`,
        lastModified: new Date(post.date),
        changeFrequency: "weekly" as const,
        priority: 0.6,
        alternates: { languages: blogLanguages(post.slug) },
      })),
    );
  } catch {}

  const absolute = (path: string) => (path === "/" ? baseUrl : `${baseUrl}${path}`);
  const homeLanguages = Object.fromEntries(
    Object.entries(homeLanguagePaths())
      .filter(([lang]) => lang !== "x-default")
      .map(([lang, path]) => [lang, absolute(path)]),
  );
  const homePages: MetadataRoute.Sitemap = pageLocales.map((locale) => ({
    url: absolute(homeHref(locale)),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 1,
    alternates: { languages: homeLanguages },
  }));

  return [
    ...homePages,
    {
      url: `${baseUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...toolPages,
    ...localizedToolPages,
    ...imageConversionPages,
    ...blogIndexPages,
    ...blogPostPages,
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
  ];
}
