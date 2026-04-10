"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPosts } from "@/lib/blog";
import {
  formatBlogDate,
  getLocalizedBlogSummary,
  parseReadMinutes,
} from "@/lib/blog-formatting";
import { useI18n } from "@/lib/i18n";

export default function BlogClient() {
  const { t, locale } = useI18n();
  const posts = getAllPosts();

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-4xl mx-auto px-5 py-16 md:py-20">
          <h1 className="text-3xl sm:text-4xl font-bold text-t-primary mb-3 tracking-tight">
            {t("nav.blog")}
          </h1>
          <p className="text-t-secondary leading-relaxed mb-10 max-w-2xl text-[15px]">
            {t("blog.subtitle")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => {
              const loc = getLocalizedBlogSummary(post, locale);
              const readMin = parseReadMinutes(post.readTime);
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="glass rounded-2xl p-6 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 group border border-border/30"
                >
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-medium uppercase tracking-wide text-accent bg-accent-light px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-[16px] font-semibold text-t-primary mb-2 group-hover:text-accent transition-colors leading-snug">
                    {loc.title}
                  </h2>

                  <p className="text-t-secondary text-[13px] leading-relaxed mb-4 line-clamp-3">
                    {loc.description}
                  </p>

                  <div className="flex items-center gap-3 text-[12px] text-t-tertiary">
                    <span>{formatBlogDate(post.date, locale)}</span>
                    <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                    <span>{t("blog.readMinutes", { count: readMin })}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/"
              className="text-[13px] font-medium text-accent hover:text-accent-hover transition-colors"
            >
              &larr; {t("blog.backHome")}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
