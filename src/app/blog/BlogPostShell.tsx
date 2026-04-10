"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { BlogPost } from "@/lib/blog";
import {
  formatBlogDate,
  getLocalizedBlogSummary,
  parseReadMinutes,
} from "@/lib/blog-formatting";
import { useI18n } from "@/lib/i18n";

type Props = {
  post: BlogPost;
  contentHtml: string;
  relatedPosts: BlogPost[];
};

export default function BlogPostShell({
  post,
  contentHtml,
  relatedPosts,
}: Props) {
  const { t, locale } = useI18n();
  const main = getLocalizedBlogSummary(post, locale);
  const readMin = parseReadMinutes(post.readTime);

  return (
    <>
      <Header />

      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-3xl mx-auto px-5 py-12 md:py-16">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-t-tertiary mb-8"
          >
            <Link
              href="/"
              className="hover:text-t-primary transition-colors shrink-0"
            >
              {t("blog.breadcrumbHome")}
            </Link>
            <span className="text-t-tertiary/80" aria-hidden>
              /
            </span>
            <Link
              href="/blog"
              className="hover:text-t-primary transition-colors shrink-0"
            >
              {t("blog.breadcrumbBlog")}
            </Link>
            <span className="text-t-tertiary/80" aria-hidden>
              /
            </span>
            <span className="text-t-secondary truncate min-w-0 max-w-full">
              {main.title}
            </span>
          </nav>

          <header className="mb-10 border-b border-border/60 pb-10">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-medium uppercase tracking-wide text-accent bg-accent-light px-2.5 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-2xl sm:text-[1.75rem] font-bold text-t-primary mb-4 leading-snug tracking-tight">
              {main.title}
            </h1>

            <p className="text-t-secondary text-[15px] leading-relaxed mb-6 max-w-2xl">
              {main.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[13px] text-t-tertiary">
              <time dateTime={post.date}>{formatBlogDate(post.date, locale)}</time>
              <span className="w-1 h-1 rounded-full bg-border shrink-0" />
              <span>{t("blog.readMinutes", { count: readMin })}</span>
            </div>
          </header>

          <article
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          <hr className="border-border my-12 md:my-14" />

          {relatedPosts.length > 0 && (
            <section className="mb-12">
              <h2 className="text-lg sm:text-xl font-semibold text-t-primary mb-6">
                {t("blog.relatedPosts")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedPosts.map((rp) => {
                  const loc = getLocalizedBlogSummary(rp, locale);
                  const rm = parseReadMinutes(rp.readTime);
                  return (
                    <Link
                      key={rp.slug}
                      href={`/blog/${rp.slug}`}
                      className="glass rounded-2xl p-5 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 group border border-border/40"
                    >
                      <h3 className="text-[14px] font-semibold text-t-primary mb-2 group-hover:text-accent transition-colors leading-snug line-clamp-3">
                        {loc.title}
                      </h3>
                      <p className="text-[12px] text-t-tertiary">
                        {formatBlogDate(rp.date, locale)} ·{" "}
                        {t("blog.readMinutes", { count: rm })}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <div className="pt-4 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-accent hover:text-accent-hover transition-colors"
            >
              <span aria-hidden className="text-base leading-none">
                ←
              </span>
              {t("blog.backToBlog")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
