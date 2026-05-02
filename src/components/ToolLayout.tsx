"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";
import AdPlaceholder from "./AdPlaceholder";
import TrustPanel from "./TrustPanel";
import { useI18n } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import {
  categoryEmojis,
  getToolBySlug,
  tools,
  type ToolCategory,
} from "@/lib/tools";
import { toolField } from "@/lib/tool-i18n";
import { useFavoriteTools } from "@/hooks/useFavoriteTools";
import { useRecentTools } from "@/hooks/useRecentTools";
import { toolSlugFromPathname } from "@/lib/tool-slug";

interface ToolLayoutProps {
  children: React.ReactNode;
  toolName: string;
  toolDescription: string;
  faq?: { q: string; a: string }[];
  /** Show privacy / local-processing explainer (default: true) */
  showTrustPanel?: boolean;
}

const catKeys: Record<ToolCategory, string> = {
  pdf: "cat.pdf",
  image: "cat.image",
  video: "cat.video",
  utility: "cat.utility",
};

export default function ToolLayout({
  children,
  toolName,
  toolDescription,
  faq,
  showTrustPanel = true,
}: ToolLayoutProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const slug = toolSlugFromPathname(pathname);
  const { trackTool } = useRecentTools();
  const { isFavorite, toggleFavorite, ready: favReady } = useFavoriteTools();
  const [openFaqIndices, setOpenFaqIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (slug) trackTool(slug);
  }, [slug, trackTool]);

  const currentTool = getToolBySlug(slug);

  const finalName = currentTool
    ? toolField(t, slug, currentTool, "name")
    : toolName;
  const finalDesc = currentTool
    ? toolField(t, slug, currentTool, "desc")
    : toolDescription;

  const relatedTools = useMemo(() => {
    if (!currentTool) return [];
    const sameCategory = tools.filter(
      (tool) =>
        tool.category === currentTool.category &&
        tool.slug !== currentTool.slug,
    );
    const otherCategory = tools.filter(
      (tool) =>
        tool.category !== currentTool.category &&
        tool.slug !== currentTool.slug,
    );
    return [...sameCategory, ...otherCategory].slice(0, 6);
  }, [currentTool]);

  const sideRailGroups = useMemo(() => {
    const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];
    const ordered = currentTool
      ? [
          currentTool.category,
          ...categories.filter((category) => category !== currentTool.category),
        ]
      : categories;

    return ordered.map((category) => ({
      category,
      items: tools.filter((tool) => tool.category === category),
    }));
  }, [currentTool]);

  const faqItems = useMemo(() => {
    if (faq) return faq;

    const commonFaqs = [
      { q: t("faq.free.q"), a: t("faq.free.a") },
      { q: t("faq.safe.q"), a: t("faq.safe.a") },
      { q: t("faq.account.q"), a: t("faq.account.a") },
    ];

    const category = currentTool?.category;
    let categoryFaqs: { q: string; a: string }[] = [];

    if (category === "pdf") {
      categoryFaqs = [{ q: t("faq.filesize.q"), a: t("faq.filesize.a") }];
    } else if (category === "image") {
      categoryFaqs = [
        { q: t("faq.formats.q"), a: t("faq.formats.a") },
        { q: t("faq.filesize.q"), a: t("faq.filesize.a") },
      ];
    } else if (category === "video") {
      categoryFaqs = [
        { q: t("faq.formats.q"), a: t("faq.formats.a") },
        { q: t("faq.slow.q"), a: t("faq.slow.a") },
      ];
    } else {
      categoryFaqs = [
        { q: t("faq.offline.q"), a: t("faq.offline.a") },
        { q: t("faq.mobile.q"), a: t("faq.mobile.a") },
      ];
    }

    return [...commonFaqs, ...categoryFaqs];
  }, [faq, currentTool, t]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="mx-auto flex w-full max-w-[1780px] gap-4 px-3 py-3 sm:px-5 lg:px-6">
          <aside className="hidden w-64 shrink-0 xl:block">
            <nav
              aria-label={t("nav.allTools")}
              className="sticky top-20 max-h-[calc(100vh-5.75rem)] overflow-y-auto rounded-3xl border border-border bg-surface/80 p-3 shadow-card backdrop-blur"
            >
              <Link
                href="/tools"
                className="mb-3 flex items-center justify-between rounded-2xl bg-bg-secondary px-3 py-2.5 text-[13px] font-semibold text-t-primary hover:bg-accent-light hover:text-accent"
              >
                <span>{t("nav.allTools")}</span>
                <span className="text-[11px] text-t-tertiary">
                  {tools.length}
                </span>
              </Link>

              <div className="space-y-4">
                {sideRailGroups.map(({ category, items }) => (
                  <div key={category}>
                    <p className="mb-1.5 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-t-tertiary">
                      <span>{categoryEmojis[category]}</span>
                      {t(catKeys[category])}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((tool) => {
                        const active = tool.slug === slug;
                        return (
                          <Link
                            key={tool.slug}
                            href={`/tools/${tool.slug}`}
                            className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[12px] transition-colors ${
                              active
                                ? "bg-accent-light text-accent"
                                : "text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                            }`}
                          >
                            <span className="shrink-0">{tool.emoji}</span>
                            <span className="min-w-0 truncate">
                              {toolField(t, tool.slug, tool, "name")}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <section className="mb-4 rounded-3xl border border-border bg-surface/80 px-4 py-3 shadow-card backdrop-blur sm:px-5">
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] text-t-tertiary">
                <Link href="/" className="hover:text-accent transition-colors">
                  {t("tool.home")}
                </Link>
                <span>/</span>
                <Link
                  href="/tools"
                  className="hover:text-accent transition-colors"
                >
                  {t("tool.tools")}
                </Link>
                <span>/</span>
                <span className="font-medium text-t-secondary">
                  {finalName}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {currentTool && (
                  <div className="relative shrink-0">
                    <div
                      className="absolute inset-0 -m-1 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-400 opacity-25 blur-lg"
                      aria-hidden="true"
                    />
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/40 dark:to-violet-900/30">
                      <span className="text-2xl leading-none">
                        {currentTool.emoji}
                      </span>
                    </div>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-2xl font-bold leading-tight tracking-tight text-t-primary sm:text-3xl">
                    {finalName}
                  </h1>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-t-secondary">
                    {finalDesc}
                  </p>
                </div>

                <div className="hidden items-center gap-2 md:flex">
                  {showTrustPanel && (
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-1.5 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
                      {t("tool.privacy")}
                    </span>
                  )}
                  {currentTool && favReady && (
                    <button
                      type="button"
                      onClick={() => toggleFavorite(currentTool.slug)}
                      aria-pressed={isFavorite(currentTool.slug)}
                      aria-label={t("nav.favoriteToggle")}
                      className="rounded-xl border border-border px-3 py-2 text-[12px] font-semibold text-t-secondary transition-colors hover:bg-bg-secondary hover:text-t-primary"
                    >
                      {isFavorite(currentTool.slug) ? "Pinned" : "Pin"}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <div className="animate-fade-up">{children}</div>

            {showTrustPanel && (
              <details className="mt-8 rounded-3xl border border-border bg-surface/70 p-4">
                <summary className="cursor-pointer text-[13px] font-semibold text-t-primary">
                  {t("trust.panelTitle")}
                </summary>
                <div className="mt-4">
                  <TrustPanel />
                </div>
              </details>
            )}

            {relatedTools.length > 0 && (
              <details className="mt-8 rounded-3xl border border-border bg-surface/70 p-4">
                <summary className="cursor-pointer text-[13px] font-semibold text-t-primary">
                  {t("related.title")}
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {relatedTools.map((tool) => (
                    <Link
                      key={tool.slug}
                      href={`/tools/${tool.slug}`}
                      className="card-premium p-4 group"
                    >
                      <span className="text-2xl">{tool.emoji}</span>
                      <h3 className="mt-2 font-medium text-t-primary transition-colors group-hover:text-accent">
                        {toolField(t, tool.slug, tool, "name")}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-t-tertiary">
                        {toolField(t, tool.slug, tool, "desc")}
                      </p>
                    </Link>
                  ))}
                </div>
              </details>
            )}

            {faqItems.length > 0 && (
              <section className="mt-8 rounded-3xl border border-border bg-surface/70 p-4">
                <h2 className="mb-4 text-[13px] font-semibold text-t-primary">
                  {t("faq.title")}
                </h2>
                <div className="space-y-2">
                  {faqItems.map((item, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-2xl border border-border bg-bg-secondary/60"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFaq(index)}
                        aria-expanded={openFaqIndices.has(index)}
                        className="flex w-full items-center justify-between px-4 py-3 text-start"
                      >
                        <span className="text-sm font-medium text-t-primary">
                          {item.q}
                        </span>
                        <svg
                          className={`ms-4 h-4 w-4 shrink-0 text-t-tertiary transition-transform duration-200 ${
                            openFaqIndices.has(index) ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {openFaqIndices.has(index) && (
                        <div className="px-4 pb-3 text-sm text-t-secondary">
                          {item.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "FAQPage",
                      mainEntity: faqItems.map((item) => ({
                        "@type": "Question",
                        name: item.q,
                        acceptedAnswer: {
                          "@type": "Answer",
                          text: item.a,
                        },
                      })),
                    }),
                  }}
                />
              </section>
            )}

            <AdPlaceholder position="bottom" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
