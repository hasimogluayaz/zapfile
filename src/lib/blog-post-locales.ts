import type { BlogPost } from "./blog";
import type { Locale } from "./locales";
import { BLOG_LOCALE_A } from "./blog-post-locales-a";
import { BLOG_LOCALE_B } from "./blog-post-locales-b";

const LOCALE = { ...BLOG_LOCALE_A, ...BLOG_LOCALE_B };

export function getLocalizedBlogSummary(
  post: BlogPost,
  locale: Locale,
): { title: string; description: string } {
  if (locale === "en") {
    return { title: post.title, description: post.description };
  }
  const row = LOCALE[post.slug]?.[locale];
  if (row) {
    return row;
  }
  return { title: post.title, description: post.description };
}
