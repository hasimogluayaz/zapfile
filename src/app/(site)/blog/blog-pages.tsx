import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { getLocalizedBlogSummary } from "@/lib/blog-formatting";
import { localizedPostContent } from "@/lib/blog-i18n";
import { blogIndexSeo } from "@/lib/blog-seo";
import { blogHref, blogLanguagePaths } from "@/lib/localized-routes";
import type { Locale } from "@/lib/locales";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_URL } from "@/lib/site-url";
import BlogClient from "./BlogClient";
import BlogPostShell from "./BlogPostShell";

/** Blog pages shared by `/blog` and the per-language `/<locale>/blog` routes. */

const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  tr: "tr_TR",
  de: "de_DE",
  fr: "fr_FR",
  es: "es_ES",
  pt: "pt_BR",
  it: "it_IT",
  ja: "ja_JP",
  ar: "ar_AR",
};

function languages(slug?: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(blogLanguagePaths(slug)).map(([lang, path]) => [lang, `${SITE_URL}${path}`]),
  );
}

export function blogIndexMetadata(locale: Locale): Metadata {
  const { title, description } = blogIndexSeo[locale];
  const url = `${SITE_URL}${blogHref(locale)}`;
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, url, type: "website", locale: OG_LOCALE[locale] },
    alternates: { canonical: url, languages: languages() },
  };
}

export function BlogIndexPage() {
  return <BlogClient />;
}

export function blogPostMetadata(slug: string, locale: Locale): Metadata {
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  const { title, description } = getLocalizedBlogSummary(post, locale);
  const url = `${SITE_URL}${blogHref(locale, slug)}`;
  return {
    title: { absolute: `${title} | ZapFile Blog` },
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      locale: OG_LOCALE[locale],
      publishedTime: post.date,
      authors: ["ZapFile"],
      tags: post.tags,
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: url, languages: languages(slug) },
  };
}

export async function BlogPostPage({ slug, locale }: { slug: string; locale: Locale }) {
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const content = locale === "en" ? post.content : await localizedPostContent(slug, locale);
  if (!content) notFound();
  // The shell already shows the title as the page's h1; drop the body's own.
  const contentHtml = renderMarkdown(content.replace(/^\s*# [^\n]*\n/, ""));
  const { title, description } = getLocalizedBlogSummary(post, locale);
  const url = `${SITE_URL}${blogHref(locale, slug)}`;

  const related = getAllPosts()
    .filter((p) => p.slug !== post.slug && p.tags.some((t) => post.tags.includes(t)))
    .slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    inLanguage: locale,
    datePublished: post.date,
    author: { "@type": "Organization", name: "ZapFile", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "ZapFile",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/android-chrome-192x192.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogPostShell post={post} contentHtml={contentHtml} relatedPosts={related} />
    </>
  );
}
