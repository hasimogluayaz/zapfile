import { MetadataRoute } from "next";
import { tools } from "@/lib/tools";
import { getImageConversions } from "@/lib/conversions";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site-url";
import { localizedToolParams, toolLanguagePaths } from "@/lib/localized-routes";

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

  let blogPostPages: MetadataRoute.Sitemap = [];
  try {
    blogPostPages = getAllPosts().map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {}

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    ...toolPages,
    ...localizedToolPages,
    ...imageConversionPages,
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
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
